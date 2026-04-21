// ============================================================
// Memory Engine — Context Assembly for the Twin's Brain
// Optimized for local cognitive reliability & human-like decay
// ============================================================

import { createHash, randomUUID } from 'crypto';
import PocketBase from 'pocketbase';
import type { UserProfile, ConversationMessage, ProfileSnapshot, Fact } from '@/types/twin';
import { OllamaTool, callOllama, fetchEmbedding } from '@/lib/ollama-client';
import { env } from '@/lib/env';
import { obs } from '@/lib/observability/observability-service';

import { config } from '@/lib/observability/config-service';

// Fallback defaults if config service fails
const DEFAULT_SIMILARITY_THRESHOLD = 0.88;
const DEFAULT_LEXICAL_OVERLAP = 0.6;
const DEFAULT_REINFORCEMENT_DELTA = 0.08;
const DEFAULT_CONFLICT_THRESHOLD = 0.7;

// Server-side PocketBase client
function getServerPB(): PocketBase {
  const pb = new PocketBase(POCKETBASE_URL);
  pb.autoCancellation(false);
  return pb;
}

function normalizeFactText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fingerprintFact(normalizedFact: string): string {
  return createHash('sha256').update(normalizedFact).digest('hex');
}

function tokenize(normalizedFact: string): Set<string> {
  return new Set(normalizedFact.split(' ').filter(Boolean));
}

function tokenOverlapScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  return intersection / Math.min(a.size, b.size);
}



function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function getFactText(record: Fact): string {
  return record.fact || record.fact_text || '';
}

async function detectContradiction(newFact: string, existingFact: string, category: string): Promise<boolean> {
  const conflictThreshold = await config.get('MEMORY_CONFLICT_THRESHOLD', DEFAULT_CONFLICT_THRESHOLD);
  try {
    const result = await callOllama(
      `Answer with JSON only: {"contradiction": boolean, "confidence": number}.\n` +
      `Evaluate if these user facts conflict in category "${category}".\n` +
      `fact_a: "${existingFact}"\n` +
      `fact_b: "${newFact}"`
    );

    const parsed = JSON.parse(result) as { contradiction?: boolean; confidence?: number };
    return parsed.contradiction === true && (parsed.confidence ?? 0) >= conflictThreshold;
  } catch {
    return false;
  }
}

/**
 * 🛠️ CAPABILITY: MEMORY_TOOLS
 * Standard tool definitions for the Twin's memory management.
 */
export const MEMORY_TOOLS: OllamaTool[] = [
  {
    type: 'function',
    function: {
      name: 'recallMemory',
      description: 'Search and recall specific facts about the user from long-term memory',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'The topic or keyword to recall' }
        },
        required: ['topic']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'saveMemory',
      description: 'Save an important new fact learned about the user to long-term memory',
      parameters: {
        type: 'object',
        properties: {
          fact: { type: 'string', description: 'The fact to remember' },
          category: { type: 'string', description: 'One of: preference, biographical, habit' }
        },
        required: ['fact', 'category']
      }
    }
  }
];

/**
 * 🧠 EXECUTOR: executeRecallMemory
 */
export async function executeRecallMemory(userId: string, topic: string): Promise<string> {
  return await obs.trace('memory_recall', {
    attributes: { 'memory.query': topic, 'user_id_hash': userId }
  }, async (span) => {
    const pb = getServerPB();
    try {
      const result = await pb.collection('facts').getList<Fact>(1, 5, {
        filter: `user_id = "${userId}" && (fact ~ "${topic}" || tags ~ "${topic}")`,
        sort: '-confidence'
      });

      obs.recordMemoryStats(span, {
        operation_type: 'retrieval',
        candidates_count: result.items.length,
        selected_ids: result.items.map(f => f.id).join(','),
      });

      if (result.items.length === 0) return "No relevant facts found for this topic.";

      return `Found ${result.items.length} facts:\n` +
        result.items.map(f => `- ${getFactText(f)} (category: ${f.category})`).join('\n');
    } catch (_error) {
      return "Failed to recall memory due to internal error.";
    }
  });
}

/**
 * 💾 EXECUTOR: executeSaveMemory
 */
export async function executeSaveMemory(userId: string, fact: string, category: string): Promise<string> {
  return await obs.trace('memory_save', {
    attributes: { 'memory.category': category, 'user_id_hash': userId }
  }, async (span) => {
    const pb = getServerPB();
    
    try {
      const now = new Date().toISOString();
      const normalizedFact = normalizeFactText(fact);
      const incomingFingerprint = fingerprintFact(normalizedFact);
      const incomingTokens = tokenize(normalizedFact);

      // Stage 1: lexical dedup (fingerprint + token overlap)
      const lexicalCandidates = await pb.collection('facts').getFullList<Fact>({
        filter: `user_id = "${userId}" && category = "${category}" && (status = "active" || status = "reinforced")`,
        sort: '-updated',
      });

      const exactFingerprintMatch = lexicalCandidates.find(f => f.fact_fingerprint === incomingFingerprint);

      // Stage 2: semantic dedup using embedding similarity
      const [lexicalThreshold] = await Promise.all([
        config.get('MEMORY_LEXICAL_OVERLAP', DEFAULT_LEXICAL_OVERLAP)
      ]);

      const overlapCandidate = lexicalCandidates
        .map(candidate => {
          const candidateNormalized = normalizeFactText(getFactText(candidate));
          const overlap = tokenOverlapScore(incomingTokens, tokenize(candidateNormalized));
          return { candidate, overlap };
        })
        .filter(item => item.overlap >= lexicalThreshold)
        .sort((a, b) => b.overlap - a.overlap)[0]?.candidate;

      const lexicalMatch = exactFingerprintMatch || overlapCandidate;

      if (lexicalMatch) {
        const [dedupThreshold, lexicalThreshold, reinforcementDelta] = await Promise.all([
          config.get('MEMORY_DEDUP_THRESHOLD', DEFAULT_SIMILARITY_THRESHOLD),
          config.get('MEMORY_LEXICAL_OVERLAP', DEFAULT_LEXICAL_OVERLAP),
          config.get('MEMORY_REINFORCEMENT_DELTA', DEFAULT_REINFORCEMENT_DELTA)
        ]);

        const [newEmbedding, existingEmbedding] = await Promise.all([
          fetchEmbedding(normalizedFact),
          fetchEmbedding(normalizeFactText(getFactText(lexicalMatch))),
        ]);

        const semanticSimilarity =
          newEmbedding && existingEmbedding ? cosineSimilarity(newEmbedding, existingEmbedding) : 0;

        if (semanticSimilarity >= dedupThreshold) {
          const boostedConfidence = Math.min(1.0, (lexicalMatch.confidence || 0.5) + reinforcementDelta);
          await pb.collection('facts').update(lexicalMatch.id, {
            reinforced_count: (lexicalMatch.reinforced_count || 0) + 1,
            confidence: parseFloat(boostedConfidence.toFixed(4)),
            updated: now,
            last_reinforced_at: now,
            status: 'reinforced',
          });

          obs.recordMemoryStats(span, { operation_type: 'write', memory_type: 'reinforcement', selected_ids: lexicalMatch.id });
          return `Memory already exists; reinforced existing fact: "${getFactText(lexicalMatch)}".`;
        }

        // Contradiction path (if semantically related but conflicting)
        const isContradiction = await detectContradiction(fact, getFactText(lexicalMatch), category);
        if (isContradiction) {
          const conflictGroupId = lexicalMatch.conflict_group_id || randomUUID();

          await pb.collection('facts').update(lexicalMatch.id, {
            status: 'conflicted',
            conflict_group_id: conflictGroupId,
            updated: now,
          });

          await pb.collection('facts').create({
            user_id: userId,
            fact,
            category,
            confidence: 0.65,
            reinforced_count: 1,
            fact_fingerprint: incomingFingerprint,
            status: 'conflicted',
            source: 'user_statement',
            last_reinforced_at: now,
            conflict_group_id: conflictGroupId,
          });

          await pb.collection('fact_revisions').create({
            user_id: userId,
            conflict_group_id: conflictGroupId,
            previous_fact_id: lexicalMatch.id,
            previous_fact: getFactText(lexicalMatch),
            revision_fact: fact,
            category,
            reason: 'contradiction_detected',
            source: 'memory_engine',
          });

          obs.recordMemoryStats(span, { operation_type: 'write', memory_type: 'contradiction', selected_ids: lexicalMatch.id });
          return `Detected contradiction for category "${category}". Stored as a conflicted revision for review.`;
        }
      }

      const newRecord = await pb.collection('facts').create({
        user_id: userId,
        fact,
        category,
        confidence: 0.8,
        reinforced_count: 1,
        fact_fingerprint: incomingFingerprint,
        status: 'active',
        source: 'user_statement',
        last_reinforced_at: now,
      });

      obs.recordMemoryStats(span, { operation_type: 'write', memory_type: 'new_fact', selected_ids: newRecord.id });
      return `Succesfully saved and reinforced fact: "${fact}" under ${category}.`;
    } catch (_error) {
      return 'Failed to save fact to long-term memory.';
    }
  });
}

/**
 * Build the full system prompt for the twin, including:
 * - Core persona from profile
 * - Adaptations from profile_snapshot
 * - Decay-aware facts from database (Addition 1)
 * - Last 15 raw conversation turns
 *
 * Design: Live Ebbinghaus filtering + context ranking.
 */
  return await obs.trace('memory_build_context', {
    attributes: { 'user_id_hash': userId }
  }, async (span) => {
    const pb = getServerPB();

    // READ 1: Profile
    let profile: UserProfile;
    try {
      profile = await pb.collection('user_profiles').getFirstListItem<UserProfile>(
        `user_id = "${userId}"`
      );
    } catch {
      return buildFallbackPrompt();
    }

    // READ 2: Last 15 conversation turns
    let recentMessages: ConversationMessage[] = [];
    try {
      const result = await pb.collection('conversations').getList<ConversationMessage>(1, 15, {
        filter: `user_id = "${userId}"`,
        sort: '-created',
      });
      recentMessages = result.items.reverse();
    } catch {}

    // 🔥 ADDITION 1: Decay-aware fact filtering
    let decayFilteredFacts: string[] = [];
    try {
      const facts = await pb.collection('facts').getFullList<Fact>({
        filter: `user_id = "${userId}" && confidence > 0.1 && status != "archived"`,
        sort: '-confidence',
        requestKey: null // Disable auto-cancel
      });

      const nowTs = Date.now();
      const factScores = facts.map(f => {
        const factText = getFactText(f);
        const referenceDate = new Date(f.last_reinforced_at || f.updated).getTime();
        const days = (nowTs - referenceDate) / 86400000;

        const baseDecay = f.category === 'biographical' ? 0.04 : 0.11;
        const reinforcementMultiplier = 1 / (1 + Math.log1p(Math.max(f.reinforced_count || 0, 0)) * 0.75);
        const effectiveDecay = baseDecay * reinforcementMultiplier;

        const recencyPenalty = days > 45 && (f.reinforced_count || 0) === 0 ? 0.85 : 1;
        const liveScore = f.confidence * Math.exp(-effectiveDecay * days) * recencyPenalty;
        return { fact: factText, liveScore };
      });

      decayFilteredFacts = factScores
        .filter(fs => fs.liveScore > 0.25)
        .sort((a, b) => b.liveScore - a.liveScore)
        .slice(0, 8)
        .map(fs => fs.fact);
      
      obs.recordMemoryStats(span, { operation_type: 'scoring', candidates_count: facts.length, selected_ids: decayFilteredFacts.length.toString() });
    } catch (_e) {
      // If facts fetch fails, fallback to snapshot
      decayFilteredFacts = profile.profile_snapshot?.top_facts || [];
    }

    const snapshot: ProfileSnapshot = typeof profile.profile_snapshot === 'string'
      ? JSON.parse(profile.profile_snapshot)
      : profile.profile_snapshot || { adaptations: {}, top_facts: [], last_updated: '' };

    const contextMain = profile.context_main || `
# MyDigitalTwin Core
You are a persist, evolving digital reflection of ${profile.display_name}.
Never break character. Never reveal you are an AI model.
`;

    const contextSoul = profile.context_soul || `
# Identity & Tone
Personality: ${profile.personality_desc}
Preferred Tone: ${snapshot.adaptations?.tone || profile.tone || 'friendly'}
Detail Level: ${snapshot.adaptations?.detail_level || 'balanced'}
`;

    const contextGuards = profile.context_guards || `
# Boundaries & Anti-patterns
- Do not hallucinate capabilities you don't have.
- Never write heavy markdown or code blocks unless requested.
- Keep responses compact for mobile.
`;

    return `[MAIN.MD]
${contextMain.trim()}

[SOUL.MD]
${contextSoul.trim()}
${snapshot.adaptations?.last_shift_note ? `Recent Shift: ${snapshot.adaptations.last_shift_note}` : ''}

[GUARDS.MD]
${contextGuards.trim()}

[PROFILE_SNAPSHOT.MD]
## Learned Facts (Retention Optimized)
Note: Facts sorted by memory strength (0=forgotten, 1=vivid).
${decayFilteredFacts.length > 0
    ? decayFilteredFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')
    : 'No vivid facts available in active memory.'}

[WORKING_MEMORY]
## Last 15 Interactions
${recentMessages.length > 0
    ? recentMessages.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n')
    : '(New conversation)'}`;
  });
}

function buildFallbackPrompt(): string {
  return `You are MyDigitalTwin. The user hasn't completed onboarding yet.
Be warm, curious, and gently guide them to tell you about themselves.`;
}
