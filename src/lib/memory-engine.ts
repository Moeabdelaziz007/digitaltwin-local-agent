// ============================================================
// Memory Engine — Context Assembly for the Twin's Brain
// Optimized for local cognitive reliability & human-like decay
// ============================================================

import PocketBase from 'pocketbase';
import type { UserProfile, ConversationMessage, ProfileSnapshot, Fact } from '@/types/twin';
import { OllamaTool, callOllama } from '@/lib/ollama-client';
import { env } from '@/lib/env';

const POCKETBASE_URL = env.POCKETBASE_URL;

// Server-side PocketBase client
function getServerPB(): PocketBase {
  const pb = new PocketBase(POCKETBASE_URL);
  pb.autoCancellation(false);
  return pb;
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
  const pb = getServerPB();
  try {
    const result = await pb.collection('facts').getList<Fact>(1, 5, {
      filter: `user_id = "${userId}" && (fact ~ "${topic}" || tags ~ "${topic}")`,
      sort: '-confidence'
    });
    
    if (result.items.length === 0) return "No relevant facts found for this topic.";
    
    return `Found ${result.items.length} facts:\n` + 
           result.items.map(f => `- ${f.fact} (category: ${f.category})`).join('\n');
  } catch (_error) {
    return "Failed to recall memory due to internal error.";
  }
}

/**
 * 💾 EXECUTOR: executeSaveMemory
 */
export async function executeSaveMemory(userId: string, fact: string, category: string): Promise<string> {
  const pb = getServerPB();
  
  try {
    // 1. Query candidates for semantic check (category match + confidence > 0.4)
    const candidates = await pb.collection('facts').getList<Fact>(1, 10, {
      filter: `user_id = "${userId}" && category = "${category}" && confidence > 0.4`,
      sort: '-confidence'
    });

    for (const existing of candidates.items) {
      // 2. Ask LLM for semantic relationship
      const prompt = `Compare these two facts and classify their relationship into EXACT one of these categories: [IDENTICAL], [REFINEMENT], [CONTRADICTION], or [NEW].
Fact A (Existing): "${existing.fact}"
Fact B (New): "${fact}"

Classification (One word only):`;

      const response = await callOllama(prompt);
      const classification = response.toUpperCase();

      if (classification.includes('IDENTICAL')) {
        // 3a. Reinforce existing fact
        const newConfidence = Math.min(1.0, existing.confidence + 0.1);
        await pb.collection('facts').update(existing.id, {
          confidence: newConfidence,
          reinforced_count: (existing.reinforced_count || 0) + 1,
          updated: new Date().toISOString()
        });
        return `Memory reinforced: "${existing.fact}" (Confirmed)`;
      }

      if (classification.includes('REFINEMENT')) {
        // 3b. Update existing fact with the new, more detailed version
        await pb.collection('facts').update(existing.id, {
          fact: fact, // New fact is the refinement
          confidence: 0.9,
          reinforced_count: (existing.reinforced_count || 0) + 1,
          updated: new Date().toISOString()
        });
        return `Memory refined: "${fact}" (Updated from "${existing.fact}")`;
      }

      if (classification.includes('CONTRADICTION')) {
        // 3c. Flag contradiction (For now, let New fact take precedence but log the shift)
        await pb.collection('facts').update(existing.id, {
          confidence: 0.2, // Drastically lower confidence in the old fact
          tags: [...(existing.tags || []), 'contradicted_by_new_input']
        });
        // We will continue to create the new fact below
      }
    }

    // 4. No identical fact found, create new record
    await pb.collection('facts').create({
      user_id: userId,
      fact,
      category,
      confidence: 0.8,
      reinforced_count: 0
    });
    return `Succesfully saved new fact: "${fact}" under ${category}.`;
  } catch (error) {
    console.error('[MEMORY/SAVE] Hardening Error:', error);
    return "Memory system is currently stabilizing. Fact not saved.";
  }
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
      filter: `user_id = "${userId}" && confidence > 0.2`,
      sort: '-confidence',
      requestKey: null // Disable auto-cancel
    });

    const factScores = facts.map(f => {
      const days = (Date.now() - new Date(f.updated).getTime()) / 86400000;
      const decay = f.category === 'biographical' ? 0.05 : 0.15;
      const liveScore = f.confidence * Math.exp(-decay * days);
      return { fact: f.fact, liveScore };
    });

    decayFilteredFacts = factScores
      .filter(fs => fs.liveScore > 0.3)
      .sort((a, b) => b.liveScore - a.liveScore)
      .slice(0, 8)
      .map(fs => fs.fact);
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
}

function buildFallbackPrompt(): string {
  return `You are MyDigitalTwin. The user hasn't completed onboarding yet.
Be warm, curious, and gently guide them to tell you about themselves.`;
}
