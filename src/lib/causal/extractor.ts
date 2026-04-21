import { createHash } from 'crypto';
import PocketBase from 'pocketbase';
import { callOllama } from '@/lib/ollama-client';
import { scoreCausalEdge } from '@/lib/causal/scoring';

export type CausalNodeType = 'event' | 'decision' | 'outcome' | 'context' | 'constraint' | 'profit';
export type CausalRelationType = 'causes' | 'amplifies' | 'reduces' | 'blocks' | 'depends_on' | 'triggers' | 'invests_in';

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
    // LLMs sometimes wrap JSON in markdown blocks
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const cleanRaw = jsonMatch ? jsonMatch[0] : content;
    
    const payload = JSON.parse(cleanRaw) as { triples?: CausalTriple[] };
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
      'Extract explicit causal relations and constraints. Return JSON only in this format:\n' +
      '{"triples": [{"source": {"label": string, "node_type": "event"|"decision"|"outcome"|"context"|"constraint"}, "target": {"label": string, "node_type": "..."}, "relation_type": "causes"|"amplifies"|"reduces"|"blocks"|"depends_on"|"triggers", "confidence": number, "evidence_span": string}]}\n' +
      `Text:\n${combined}`
    );

    return parseTriples(response);
  } catch (error) {
    console.error('[CAUSAL_EXTRACTOR] Extraction failed:', error);
    return [];
  }
}

async function upsertNode(pb: PocketBase, userId: string, node: CausalNodeInput): Promise<string> {
  const normalized = normalizeLabel(node.label);
  
  try {
    const existing = await pb.collection('causal_nodes').getFirstListItem(
      `user_id = "${userId}" && normalized_label = "${normalized.replace(/"/g, '\\"')}" && node_type = "${node.node_type}"`
    );
    return existing.id;
  } catch {
    const created = await pb.collection('causal_nodes').create({
      user_id: userId,
      label: node.label,
      normalized_label: normalized,
      node_type: node.node_type,
    });
    return created.id;
  }
}

export async function persistCausalTriples(
  pb: PocketBase,
  userId: string,
  triples: CausalTriple[],
): Promise<void> {
  for (const triple of triples) {
    try {
      const sourceId = await upsertNode(pb, userId, triple.source);
      const targetId = await upsertNode(pb, userId, triple.target);
      const fingerprint = makeFingerprint(userId, triple.source.label, triple.target.label, triple.relation_type);

      let existingEdge;
      try {
        existingEdge = await pb.collection('causal_edges').getFirstListItem(
          `user_id = "${userId}" && fingerprint = "${fingerprint}"`
        );
      } catch {
        existingEdge = null;
      }

      if (existingEdge) {
        const evidenceCount = (existingEdge.evidence_count || 1) + 1;
        const baseWeight = clamp01((Number(existingEdge.weight || triple.confidence) + triple.confidence) / 2);
        const scored = scoreCausalEdge({
          baseWeight,
          evidenceCount,
          contradictionCount: existingEdge.contradiction_count || 0,
          lastObservedAt: new Date().toISOString(),
        });

        await pb.collection('causal_edges').update(existingEdge.id, {
          source: sourceId,
          target: targetId,
          relation_type: triple.relation_type,
          evidence: triple.evidence_span,
          weight: scored.finalScore,
          evidence_count: evidenceCount,
          last_observed_at: new Date().toISOString(),
        });
      } else {
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
    } catch (err) {
      console.error('[CAUSAL_EXTRACTOR] Persistence error for triple:', triple, err);
    }
  }
}

export function isImportantCausalTurn(message: string): boolean {
  const trimmed = message.trim();
  if (trimmed.length >= 100) return true;
  // Look for causal connectors
  return /\b(because|consequently|results in|leads to|depends on|triggers|since|prevents|inhibits)\b/i.test(trimmed);
}
