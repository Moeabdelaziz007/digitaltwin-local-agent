// /api/conversation — Dual-Mode Chat Endpoint (Streaming + Tool-Calling)
import * as Sentry from '@sentry/nextjs';
//
// GET:  Real-time streaming (Optimized for Web UI consumption)
// POST: Atomic, tool-augmented logic (Optimized for structured UI/Reflection)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { auth } from '@clerk/nextjs/server';
import {
  buildMemoryContext,
  MEMORY_TOOLS,
  executeRecallMemory,
  executeSaveMemory
} from '@/lib/memory-engine';
import { callOllamaWithTools, streamOllama } from '@/lib/ollama-client';
import { safeFetch } from '@/lib/safe-fetch';
import { v4 as uuidv4 } from 'uuid';
import type { ConversationRequest } from '@/types/twin';
import crypto from 'crypto';
import { env } from '@/lib/env';

const TURN_COLLECTION = 'conversation_turns';
const COUNTER_COLLECTION = 'session_counters';

// SIDECAR_URL is resolved inside triggerReflection() to avoid stale module-level state

/**
 * Server-side PocketBase client (data layer only, no auth forwarding)
 */
function getServerPB(): PocketBase {
  const pb = new PocketBase(env.POCKETBASE_URL);
  pb.autoCancellation(false);
  return pb;
}

async function getOrCreateSessionCounter(pb: PocketBase, userId: string, sessionId: string) {
  const filter = `user_id = "${userId}" && session_id = "${sessionId}"`;
  try {
    return await pb.collection(COUNTER_COLLECTION).getFirstListItem(filter);
  } catch {
    try {
      return await pb.collection(COUNTER_COLLECTION).create({
        user_id: userId,
        session_id: sessionId,
        next_turn_index: 0,
      });
    } catch {
      return await pb.collection(COUNTER_COLLECTION).getFirstListItem(filter);
    }
  }
}

async function reserveTurnIndex(pb: PocketBase, userId: string, sessionId: string): Promise<number> {
  const maxAttempts = 7;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const counter = await getOrCreateSessionCounter(pb, userId, sessionId);
    const current = Number(counter.next_turn_index ?? 0);

    try {
      await pb.collection(COUNTER_COLLECTION).update(counter.id, {
        next_turn_index: current + 1,
      });
      return current;
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    }
  }

  throw new Error('Failed to reserve turn index');
}

async function findTurnByIdempotency(
  pb: PocketBase,
  userId: string,
  sessionId: string,
  idempotencyKey: string,
) {
  try {
    return await pb.collection(TURN_COLLECTION).getFirstListItem(
      `user_id = "${userId}" && session_id = "${sessionId}" && idempotency_key = "${idempotencyKey}"`,
    );
  } catch {
    return null;
  }
}

/**
 * PHASE 2: Sidecar Request Signing
 * Generates an HMAC-SHA256 signature for payload verification.
 */
function generateSignature(payload: object, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}



/**
 * FEATURE 1 — GET: Real-time Streaming Endpoint
 * Usage: /api/conversation?userId=...&message=...&sessionId=...
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const message = searchParams.get('message');
  const sessionId = searchParams.get('sessionId') || uuidv4();

  if (!message) {
    return NextResponse.json({ error: 'Missing message' }, { status: 400 });
  }

  const pb = getServerPB();
  const systemPrompt = await buildMemoryContext(userId);
  const encoder = new TextEncoder();

  // Create character-by-character stream
  const stream = new ReadableStream({
    async start(controller) {
      let fullReply = "";

      try {
        // Step 1: Stream from LLM
        for await (const token of streamOllama(message, [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ])) {
          fullReply += token;
          controller.enqueue(encoder.encode(token));
        }

        // Step 2: Finalize stream
        controller.close();

        // 🔥 Fire-and-Forget Persistence (async)
        void (async () => {
          try {
            const turnIndex = await reserveTurnIndex(pb, userId, sessionId);
            const userMessageId = uuidv4();
            const twinMessageId = uuidv4();

            // Create the turn envelope
            const turn = await pb.collection(TURN_COLLECTION).create({
              user_id: userId,
              session_id: sessionId,
              turn_index: turnIndex,
              status: 'completed',
              request_message_id: userMessageId,
              response_content: fullReply,
            });

            // Save User message
            await pb.collection('conversations').create({
              user_id: userId,
              session_id: sessionId,
              role: 'user',
              content: message,
              turn_index: turnIndex,
              turn_id: turn.id,
              message_id: userMessageId,
            });

            // Save Twin response
            await pb.collection('conversations').create({
              user_id: userId,
              session_id: sessionId,
              role: 'twin',
              content: fullReply,
              turn_index: turnIndex,
              turn_id: turn.id,
              message_id: twinMessageId,
            });

            // Update turn with links
            await pb.collection(TURN_COLLECTION).update(turn.id, {
              user_message_id: userMessageId,
              twin_message_id: twinMessageId,
            });

            // Trigger Reflection if needed
            triggerReflection(userId, sessionId).catch(() => {});
          } catch (e) {
            console.error('[STREAM/SAVE] Persistence error:', e);
          }
        })();

      } catch (err) {
        controller.error(err);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Session-Id': sessionId,
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * FEATURE 2 — POST: Upgraded Tool Calling Handler
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ConversationRequest = await request.json();
    const {
      message,
      sessionId: existingSessionId,
      idempotencyKey,
    } = body;

    const sessionId = existingSessionId || uuidv4();
    const messageId = uuidv4();
    const pb = getServerPB();
    const userId = clerkUserId;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const normalizedIdempotencyKey = idempotencyKey?.trim() || null;

    // Return prior completed response if this request already ran.
    if (normalizedIdempotencyKey) {
      const existingTurn = await findTurnByIdempotency(pb, userId, sessionId, normalizedIdempotencyKey);
      if (existingTurn && existingTurn.status === 'completed' && typeof existingTurn.response_content === 'string') {
        const cachedEtag = crypto
          .createHash('md5')
          .update(existingTurn.response_content + sessionId + existingTurn.turn_index)
          .digest('hex')
          .slice(0, 16);

        return NextResponse.json({
          reply: existingTurn.response_content,
          sessionId,
          turnIndex: existingTurn.turn_index,
          messageId: existingTurn.request_message_id || messageId,
          turnId: existingTurn.id,
          idempotentReplay: true,
        }, {
          headers: {
            ETag: `"${cachedEtag}"`,
            'Cache-Control': 'no-store',
          },
        });
      }
    }

    // Reserve turn index from a per-session counter.
    const turnIndex = await reserveTurnIndex(pb, userId, sessionId);

    // Create the turn envelope first.
    let turn = await pb.collection(TURN_COLLECTION).create({
      user_id: userId,
      session_id: sessionId,
      turn_index: turnIndex,
      idempotency_key: normalizedIdempotencyKey,
      status: 'processing',
      request_message_id: messageId,
    });

    // If this was a race for the same idempotency key, replay winner's response.
    if (normalizedIdempotencyKey) {
      const duplicateTurn = await findTurnByIdempotency(pb, userId, sessionId, normalizedIdempotencyKey);
      if (duplicateTurn && duplicateTurn.id !== turn.id && duplicateTurn.status === 'completed' && typeof duplicateTurn.response_content === 'string') {
        turn = duplicateTurn;

        const cachedEtag = crypto
          .createHash('md5')
          .update(turn.response_content + sessionId + turn.turn_index)
          .digest('hex')
          .slice(0, 16);

        return NextResponse.json({
          reply: turn.response_content,
          sessionId,
          turnIndex: turn.turn_index,
          messageId: turn.request_message_id,
          turnId: turn.id,
          idempotentReplay: true,
        }, {
          headers: {
            ETag: `"${cachedEtag}"`,
            'Cache-Control': 'no-store',
          },
        });
      }
    }

    // Save User message linked to turn envelope.
    const userMessageRecord = await pb.collection('conversations').create({
      user_id: userId,
      session_id: sessionId,
      role: 'user',
      content: message.trim(),
      turn_index: turnIndex,
      turn_id: turn.id,
      message_id: messageId,
    });

    // Build Memory Context (Ebbinghaus-aware)
    const systemPrompt = await buildMemoryContext(userId);

    // Autonomous Tool Calling Cycle
    const reply = await callOllamaWithTools(
      systemPrompt,
      message.trim(),
      MEMORY_TOOLS,
      async (toolName, args) => {
        if (toolName === 'recallMemory') {
          return await executeRecallMemory(userId, args.topic as string);
        }
        if (toolName === 'saveMemory') {
          return await executeSaveMemory(userId, args.fact as string, args.category as string);
        }
        return 'Tool not found';
      }
    );

    const twinMessageId = uuidv4();

    // Save Twin reply linked to turn envelope.
    await pb.collection('conversations').create({
      user_id: userId,
      session_id: sessionId,
      role: 'twin',
      content: reply,
      turn_index: turnIndex,
      turn_id: turn.id,
      message_id: twinMessageId,
    });

    await pb.collection(TURN_COLLECTION).update(turn.id, {
      status: 'completed',
      response_content: reply,
      user_message_id: userMessageRecord.id,
      twin_message_id: twinMessageId,
    });

    // Trigger Reflection
    if (Math.floor(turnIndex / 2) % 5 === 0) {
      triggerReflection(userId, sessionId).catch(() => {});
    }

    // Response DTO with ETag
    const etag = crypto.createHash('md5').update(reply + sessionId + turnIndex).digest('hex').slice(0, 16);

    return NextResponse.json({
      reply,
      sessionId,
      turnIndex,
      messageId,
      turnId: turn.id,
      idempotentReplay: false,
    }, {
      headers: {
        ETag: `"${etag}"`,
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('[POST/conversation] Error:', error);
    return NextResponse.json({ error: 'Failed to process conversation' }, { status: 500 });
  }
}

/**
 * Fire-and-forget reflection trigger
 */
async function triggerReflection(userId: string, sessionId: string): Promise<void> {
  try {
    const url = env.SIDECAR_URL;
    const secret = env.SIDECAR_SHARED_SECRET;
    if (!url || !secret) return;

    const rawBody = JSON.stringify({ user_id: userId, session_id: sessionId });
    const ts = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${ts}.${rawBody}`)
      .digest('hex');

    const result = await safeFetch(`${url}/reflect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dmt-ts': ts,
        'x-dmt-signature': signature,
      },
      body: rawBody,
    }, {
      timeoutMs: 5000,
      retries: 2,
      backoffMs: 300,
      sessionId,
    });

    if (!result.ok) {
      console.error('[triggerReflection] Sidecar reflection request failed', {
        session_id: sessionId,
        user_id: userId,
        status: result.status,
        error: result.error,
      });
      Sentry.captureMessage('Sidecar reflection failed', {
        level: 'warning',
        extra: { status: result.status, error: result.error, sessionId }
      });
    }
  } catch (error) {
    console.error('[triggerReflection] Unexpected reflection trigger error', {
      session_id: sessionId,
      user_id: userId,
      error,
    });
    Sentry.captureException(error, {
      tags: { context: 'sidecar-reflection', userId },
      extra: { sessionId }
    });
  }
}
