// ============================================================
// Memory Engine — Context Assembly for the Twin's Brain
// Optimized for local cognitive reliability & human-like decay
// ============================================================

import { createHash, randomUUID } from 'crypto';
import type { UserProfile, ConversationMessage, ProfileSnapshot, Fact, ResearchGem } from '@/types/twin';
import { OllamaTool, callOllama, fetchEmbedding } from '@/lib/ollama-client';
import { toolRegistry } from '@/lib/plugins/tool-registry';
import { ToolDefinition } from '@/lib/plugins/plugin-schema';
import { skillRegistry } from '@/lib/skills/registry';


import { getServerPB } from './pb-server';
import { config } from './observability/config-service';
import { obs } from './observability/observability-service';
import { tieredMemory, MemoryEntry } from './memory/tiered-store';

// Fallback defaults if config service fails
const DEFAULT_SIMILARITY_THRESHOLD = 0.88;
const DEFAULT_LEXICAL_OVERLAP = 0.6;
const DEFAULT_REINFORCEMENT_DELTA = 0.08;
const DEFAULT_CONFLICT_THRESHOLD = 0.7;
const asPbUserId = (identity: string) => identity.trim();

// Redundant helper removed, using import instead.

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

function registerBuiltInMemoryTools(): void {
  const memoryTools: Array<{ definition: ToolDefinition; executor: (args: Record<string, unknown>, context?: { userId?: string }) => Promise<unknown>; }> = [
    {
      definition: {
        name: 'recallMemory',
        description: 'Search and recall specific facts about the user from long-term memory',
        namespace: 'memory',
        permissions: ['memory_read'],
        parameters: {
          type: 'object',
          properties: {
            topic: { type: 'string', description: 'The topic or keyword to recall' },
          },
          required: ['topic'],
        },
      },
      executor: async (args, context) => {
        const topic = String(args.topic ?? '');
        return await executeRecallMemory(context?.userId ?? 'system', topic);
      },
    },
    {
      definition: {
        name: 'saveMemory',
        description: 'Save an important new fact learned about the user to long-term memory',
        namespace: 'memory',
        permissions: ['memory_write'],
        parameters: {
          type: 'object',
          properties: {
            fact: { type: 'string', description: 'The fact to remember' },
            category: { type: 'string', description: 'One of: preference, biographical, habit' },
          },
          required: ['fact', 'category'],
        },
      },
      executor: async (args, context) => {
        const fact = String(args.fact ?? '');
        const category = String(args.category ?? '');
        return await executeSaveMemory(context?.userId ?? 'system', fact, category);
      },
    },
  ];

  for (const tool of memoryTools) {
    toolRegistry.registerTool(tool.definition, tool.executor);
  }
}

registerBuiltInMemoryTools();

export const MEMORY_TOOLS: OllamaTool[] = toolRegistry.getToolDefinitions();

/**
 * 🧠 EXECUTOR: executeRecallMemory
 */
export async function executeRecallMemory(userId: string, topic: string): Promise<string> {
  const pbUserId = asPbUserId(userId);
  return await obs.trace('memory_recall', {
    attributes: { 'memory.query': topic, 'user_id_hash': pbUserId }
  }, async (span) => {
    try {
      // 1. Search HOT (Memory)
      const hotEntries = tieredMemory.getHotContext()
        .filter(e => e.content.toLowerCase().includes(topic.toLowerCase()));

      // 2. Search WARM (PocketBase)
      const warmEntries = await tieredMemory.searchWarm(topic);

      const allEntries = [...hotEntries, ...warmEntries];

      obs.recordMemoryStats(span, {
        operation_type: 'retrieval',
        candidates_count: allEntries.length,
        selected_ids: allEntries.map(f => f.id).join(','),
      });

      if (allEntries.length === 0) return "No relevant facts found for this topic.";

      return `Found ${allEntries.length} facts:\n` +
        allEntries.map(f => `- ${f.content} (type: ${f.type})`).join('\n');
    } catch {
      return "Failed to recall memory due to internal error.";
    }
  });
}

/**
 * 💾 EXECUTOR: executeSaveMemory
 */
export async function executeSaveMemory(userId: string, fact: string, category: string): Promise<string> {
  const pbUserId = asPbUserId(userId);
  return await obs.trace('memory_save', {
    attributes: { 'memory.category': category, 'user_id_hash': pbUserId }
  }, async (span) => {
    try {
      // Use the Tiered Memory Engine for physical L1/L2/L3 routing
      await tieredMemory.add(fact, category as any, { userId: pbUserId });

      obs.recordMemoryStats(span, { 
        operation_type: 'write', 
        memory_type: 'tiered_save' 
      });
      
      return `Successfully saved and reinforced fact: "${fact}" under ${category}.`;
    } catch (e: any) {
      console.error('[MemoryEngine] Save failed:', e.message);
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
export async function buildMemoryContext(userId: string): Promise<string> {
  const pbUserId = asPbUserId(userId);
  return await obs.trace('memory_build_context', {
    attributes: { 'user_id_hash': pbUserId }
  }, async (span) => {
    const pb = getServerPB();

    // Parallel Data Fetching for optimized latency
    let recentMessages: ConversationMessage[] = [];
    let decayFilteredFacts: string[] = [];
    let researchGems: string[] = [];

    const [profileRes, messagesRes, factsRes, gemsRes] = await Promise.allSettled([
      (pb.collection('user_profiles') as any).getFirstListItem(`user_id = "${pbUserId}"`),
      (pb.collection('conversations') as any).getList(1, 15, {
        filter: `user_id = "${pbUserId}"`,
        sort: '-created',
      }),
      (pb.collection('facts') as any).getFullList({
        filter: `user_id = "${pbUserId}" && confidence > 0.1 && status != "archived"`,
        sort: '-confidence',
        requestKey: null
      }),
      (pb.collection('research_gems') as any).getList(1, 4, {
        filter: `user_id = "${pbUserId}" && status = "saved"`,
        sort: '-relevance_score'
      })
    ]);

    // Stage 1: Profile handling
    if (profileRes.status === 'rejected') return buildFallbackPrompt();
    const profile = profileRes.value;

    // Stage 2: Conversation history
    if (messagesRes.status === 'fulfilled') {
      recentMessages = messagesRes.value.items.reverse();
    }

    // 🔥 STAGE 3: Decay-aware fact filtering
    if (factsRes.status === 'fulfilled') {
      const facts = factsRes.value;
      const nowTs = Date.now();
      const factScores = facts.map((f: Fact) => {
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
        .filter((fs: { fact: string; liveScore: number }) => fs.liveScore > 0.25)
        .sort((a: { fact: string; liveScore: number }, b: { fact: string; liveScore: number }) => b.liveScore - a.liveScore)
        .slice(0, 8)
        .map((fs: { fact: string; liveScore: number }) => fs.fact);
      
      obs.recordMemoryStats(span, { operation_type: 'scoring', candidates_count: facts.length, selected_ids: decayFilteredFacts.length.toString() });
    } else {
      decayFilteredFacts = profile.profile_snapshot?.top_facts || [];
    }

    // 🔥 STAGE 4: Research Gems
    if (gemsRes.status === 'fulfilled') {
      researchGems = gemsRes.value.items.map((g: ResearchGem) => `[GEM]: ${g.title} - ${g.implementation_notes}`);
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

[RESEARCH_MEMORY]
## Intelligence Gems (Curated Research)
${researchGems.length > 0
    ? researchGems.join('\n')
    : 'No recent research findings relevant to current focus.'}

${skillRegistry.getActiveSkillsContext()}

[WORKING_MEMORY]
## Last 15 Interactions
${recentMessages.length > 0
    ? recentMessages.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n')
    : '(New conversation)'}`;
  });
}

/**
 * 👤 CAPABILITY: USER_PROFILE_ACCESS
 */
export async function getUserProfile(userId?: string): Promise<UserProfile | null> {
  const pbUserId = asPbUserId(userId || 'system');
  const pb = getServerPB();
  try {
    return await (pb.collection('user_profiles') as any).getFirstListItem(`user_id = "${pbUserId}"`);
  } catch {
    return null;
  }
}

function buildFallbackPrompt(): string {
  return `You are MyDigitalTwin. The user hasn't completed onboarding yet.
Be warm, curious, and gently guide them to tell you about themselves.`;
}
