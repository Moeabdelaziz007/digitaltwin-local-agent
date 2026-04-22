import { env } from '@/lib/env';
import { UserSignal } from '@/lib/opportunity/types';
import { cachedFetch } from '../cache';

type ConversationRecord = {
  id: string;
  content?: string;
};

const PAIN_POINT_HINTS = [
  'slow',
  'manual',
  'error',
  'expensive',
  'blocked',
  'confusing',
  'takes too long',
  'repetitive',
];

function normalizePainPoint(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

/**
 * Extracts pain points and user signals from recent conversations in PocketBase.
 */
export async function fetchUserSignals(userId: string, focus: string[] = []): Promise<UserSignal[]> {
  const filter = encodeURIComponent(`user_id="${userId}" && role="user"`);
  const sort = '-created';
  const url = `${env.POCKETBASE_URL}/api/collections/conversations/records?page=1&perPage=100&filter=${filter}&sort=${sort}`;

  try {
    const response = await cachedFetch(url, 'user-signals');
    if (!response.ok) throw new Error(`PocketBase API failed: ${response.statusText}`);
    
    const messages = await response.json();

    const painMap = new Map<string, { frequency: number; confidence: number; sourceRef: string }>();

    for (const message of messages.items) {
      const content = message.content?.trim();
      if (!content) continue;

      const normalized = normalizePainPoint(content);
      const hasHint = PAIN_POINT_HINTS.some((hint) => normalized.includes(hint));
      const fitsFocus = focus.length === 0 || focus.some((tag) => normalized.includes(tag.toLowerCase()));
      
      if (!hasHint || !fitsFocus) continue;

      const existing = painMap.get(normalized);
      painMap.set(normalized, {
        frequency: (existing?.frequency ?? 0) + 1,
        confidence: Math.min(0.9, (existing?.confidence ?? 0.45) + 0.08),
        sourceRef: `conversation:${message.id}`,
      });
    }

    return Array.from(painMap.entries())
      .slice(0, 12)
      .map(([painPoint, meta]) => ({
        painPoint,
        frequency: meta.frequency,
        severity: Math.min(1, 0.35 + meta.frequency * 0.12),
        sourceRef: meta.sourceRef,
        confidence: meta.confidence,
      }));
  } catch (error) {
    console.error('[user-signals] fetch failed', error);
    return [];
  }
}
