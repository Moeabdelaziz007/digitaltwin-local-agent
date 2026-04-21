import { createHash } from 'crypto';
import PocketBase from 'pocketbase';
import { callOllama } from '@/lib/ollama-client';
import { scoreCausalEdge } from '@/lib/memory/causal-scoring';

export type CausalNodeType = 'event' | 'decision' | 'outcome' | 'context';
export type CausalRelationType = 'causes' | 'amplifies' | 'reduces' | 'blocks' | 'depends_on';

interface CausalNodeInput {
  label: string;
  node_type: CausalNodeType;
}

export interface CausalTriple {
  source: CausalNodeInput;
  target: CausalNodeInput;
  relation_type: CausalRelationType;
  confidence: number;
  evidence_span: string;
}

export interface ExtractorInput {
  userMessage: string;
  assistantMessage?: string;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, ' ').trim();
}

function makeFingerprint(userId: string, source: string, target: string, relation: string): string {
  return createHash('sha256')
    .update(`${userId}:${normalizeLabel(source)}:${relation}:${normalizeLabel(target)}`)
    .digest('hex');
}

function parseTriples(content: string): CausalTriple[] {
  try {
    const payload = JSON.parse(content) as { triples?: CausalTriple[] };
    const triples = payload.triples ?? [];

    return triples
      .filter((t) => t?.source?.label && t?.target?.label && t?.relation_type)
      .map((t) => ({
        ...t,
        confidence: clamp01(t.confidence ?? 0.5),
        evidence_span: (t.evidence_span || '').slice(0, 500),
      }));
  } catch {
    return [];
  }
}

export async function extractCausalTriples(input: ExtractorInput): Promise<CausalTriple[]> {
  const combined = [input.userMessage, input.assistantMessage].filter(Boolean).join('\n');
  if (combined.length < 20) return [];

  try {
    const response = await callOllama(
      `Return JSON only: {"triples": [{"source": {"label": string, "node_type": "event"|"decision"|"outcome"|"context"}, "target": {"label": string, "node_type": "event"|"decision"|"outcome"|"context"}, "relation_type": "causes"|"amplifies"|"reduces"|"blocks"|"depends_on", "confidence": number, "evidence_span": string}]}.\n` +
      'Extract only explicit or strongly implied causal relations from the text. Avoid speculative links.\n' +
      `Text:\n${combined}`
    );

    return parseTriples(response);
  } catch {
    return [];
  }
}

async function upsertNode(pb: PocketBase, userId: string, node: CausalNodeInput): Promise<string> {
  const normalized = normalizeLabel(node.label);
  const existing = await pb.collection('causal_nodes').getFullList({
    filter: `user_id = "${userId}" && normalized_label = "${normalized.replace(/"/g, '\\"')}" && node_type = "${node.node_type}"`,
  });

  if (existing[0]?.id) return existing[0].id as string;

  const created = await pb.collection('causal_nodes').create({
    user_id: userId,
    label: node.label,
    normalized_label: normalized,
    node_type: node.node_type,
  });

  return created.id as string;
}

export async function persistCausalTriples(
  pb: PocketBase,
  userId: string,
  triples: CausalTriple[],
): Promise<void> {
  for (const triple of triples) {
    const sourceId = await upsertNode(pb, userId, triple.source);
    const targetId = await upsertNode(pb, userId, triple.target);
    const fingerprint = makeFingerprint(userId, triple.source.label, triple.target.label, triple.relation_type);

    const existing = await pb.collection('causal_edges').getFullList({
      filter: `user_id = "${userId}" && fingerprint = "${fingerprint}"`,
    });

    const existingEdge = existing[0];
    if (existingEdge?.id) {
      const evidenceCount = Number(existingEdge.evidence_count ?? 1) + 1;
      const baseWeight = clamp01((Number(existingEdge.weight ?? triple.confidence) + triple.confidence) / 2);
      const scored = scoreCausalEdge({
        baseWeight,
        evidenceCount,
        contradictionCount: Number(existingEdge.contradiction_count ?? 0),
        lastObservedAt: new Date().toISOString(),
      });

      await pb.collection('causal_edges').update(existingEdge.id as string, {
        source: sourceId,
        target: targetId,
        relation_type: triple.relation_type,
        evidence: triple.evidence_span,
        weight: scored.finalScore,
        evidence_count: evidenceCount,
        last_observed_at: new Date().toISOString(),
      });
      continue;
    }

    const scored = scoreCausalEdge({
      baseWeight: triple.confidence,
      evidenceCount: 1,
      contradictionCount: 0,
      lastObservedAt: new Date().toISOString(),
    });

    await pb.collection('causal_edges').create({
      user_id: userId,
      source: sourceId,
      target: targetId,
      relation_type: triple.relation_type,
      weight: scored.finalScore,
      evidence: triple.evidence_span,
      fingerprint,
      evidence_count: 1,
      contradiction_count: 0,
      last_observed_at: new Date().toISOString(),
    });
  }
}

export function isImportantTurn(message: string): boolean {
  const trimmed = message.trim();
  if (trimmed.length >= 80) return true;
  return /(because|so that|if i|should i|decide|plan|risk|tradeoff)/i.test(trimmed);
}
