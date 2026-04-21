import PocketBase from 'pocketbase';
import { env } from '@/lib/env';
import { UserSignal } from '@/lib/opportunity/types';

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

export async function fetchUserSignals(userId: string, focus: string[] = []): Promise<UserSignal[]> {
  const pb = new PocketBase(env.POCKETBASE_URL);
  pb.autoCancellation(false);

  const messages = await pb
    .collection('conversations')
    .getList<ConversationRecord>(1, 100, { filter: `user_id="${userId}" && role="user"`, sort: '-created' });

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
}
