// /api/conversation — Dual-Mode Chat Endpoint (Streaming + Tool-Calling)
//
// GET:  Real-time streaming (Optimized for Web UI consumption)
// POST: Atomic, tool-augmented logic (Optimized for structured UI/Reflection)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { buildMemoryContext } from '@/lib/memory-engine';
import { streamOllama, OllamaMessage } from '@/lib/ollama-client';
import { toolRegistry } from '@/lib/plugins/tool-registry';
import { executeTool } from '@/lib/plugins/gateway';
import { obs } from '@/lib/observability/observability-service';
import { safeFetch } from '@/lib/safe-fetch';
import { getServerPB } from '@/lib/pb-server';
import { v4 as uuidv4 } from 'uuid';
import type { ConversationRequest } from '@/types/twin';
import crypto from 'crypto';
import { env } from '@/lib/env';

const TURN_COLLECTION = 'conversation_turns';
const COUNTER_COLLECTION = 'session_counters';
const GUARDIAN_USER_ID = 'system_guardian';
const asPbUserId = (identity: string) => identity.trim();

// SIDECAR_URL is resolved inside triggerReflection() to avoid stale module-level state

// SIDECAR_URL is resolved inside triggerReflection() to avoid stale module-level state

async function getOrCreateSessionCounter(pb: PocketBase, userId: string, sessionId: string) {
  const filter = `user_id = "${userId}" && session_id = "${sessionId}"`;
  try {
    return await pb.collection(COUNTER_COLLECTION).getFirstListItem(filter);
  } catch {
    console.log(`[CONV_API] Session counter not found, attempting creation for ${sessionId}`);
    try {
      return await pb.collection(COUNTER_COLLECTION).create({
        user_id: userId,
        session_id: sessionId,
        next_turn_index: 0,
      });
    } catch (createErr: unknown) {
      const err = createErr as { data?: unknown; message?: string };
      console.error(`[CONV_API] FAILED to create session counter:`, err.data || err.message);
      // Final attempt to fetch (to handle race condition)
      return await pb.collection(COUNTER_COLLECTION).getFirstListItem(filter);
    }
  }
}

async function reserveTurnIndex(pb: PocketBase, userId: string, sessionId: string): Promise<number> {
  const maxAttempts = 7;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const counter = await getOrCreateSessionCounter(pb, userId, sessionId) as any;
    const current = Number(counter.next_turn_index ?? 0);

    try {
      await pb.collection(COUNTER_COLLECTION).update(counter.id, {
        next_turn_index: current + 1,
      });
      return current;
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        console.error(`[CONVERSATION_API] Critical: Failed to reserve turn index for session ${sessionId} after ${maxAttempts} attempts. Potential write conflict.`);
        throw error;
      }
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
 * FEATURE 1 — GET: Real-time Streaming Endpoint
 * Usage: /api/conversation?userId=...&message=...&sessionId=...
 */
export async function GET(request: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = asPbUserId(clerkUserId);

  const { searchParams } = new URL(request.url);
  const message = searchParams.get('message');
  const sessionId = searchParams.get('sessionId') || uuidv4();

  if (!message) {
    return NextResponse.json({ error: 'Missing message' }, { status: 400 });
  }

  return await obs.trace('api_conversation_get', {
    attributes: {
      'request_type': 'chat_stream',
      'session_id': sessionId,
      'user_id_hash': userId,
    }
  }, async (span) => {
    const pb = getServerPB();
    const systemPrompt = await buildMemoryContext(userId);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let fullReply = "";
        try {
          for await (const token of streamOllama(message, [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ])) {
            fullReply += token;
            controller.enqueue(encoder.encode(token));
          }
          controller.close();

          void (async () => {
            try {
              const turnIndex = await reserveTurnIndex(pb, userId, sessionId);
              const userMessageId = uuidv4();
              const twinMessageId = uuidv4();

              const turn = await pb.collection(TURN_COLLECTION).create({
                user_id: userId,
                session_id: sessionId,
                turn_index: turnIndex,
                status: 'completed',
                request_message_id: userMessageId,
                response_content: fullReply,
              }) as any;

              await pb.collection('conversations').create({
                user_id: userId,
                session_id: sessionId,
                role: 'user',
                content: message,
                turn_index: turnIndex,
                turn_id: turn.id,
                message_id: userMessageId,
              });

              await pb.collection('conversations').create({
                user_id: userId,
                session_id: sessionId,
                role: 'twin',
                content: fullReply,
                turn_index: turnIndex,
                turn_id: turn.id,
                message_id: twinMessageId,
              });

              await pb.collection(TURN_COLLECTION).update(turn.id, {
                user_message_id: userMessageId,
                twin_message_id: twinMessageId,
              });

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
        'X-Trace-Id': span.spanContext().traceId,
        'Cache-Control': 'no-store',
      },
    });
  });
}

/**
 * FEATURE 2 — POST: Upgraded Tool Calling Handler
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { userId: clerkUserId } = await auth();
    const headersList = await headers();
    const guardianAuth = headersList.get('X-Guardian-Auth');
    const isGuardian = guardianAuth === env.CRON_SECRET; 
    
    const userId = clerkUserId
      ? asPbUserId(clerkUserId)
      : (isGuardian ? GUARDIAN_USER_ID : null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ConversationRequest = await request.json();
    const {
      message,
      sessionId: existingSessionId,
      idempotencyKey,
    } = body;

    const sessionId = existingSessionId || uuidv4();

    return await obs.trace('api_conversation_post', {
      attributes: {
        'request_type': 'chat_atomic',
        'session_id': sessionId,
        'user_id_hash': clerkUserId || 'anonymous',
      }
    }, async (span) => {
      const messageId = uuidv4();
      const pb = getServerPB();

      if (!message?.trim()) {
        return NextResponse.json({ error: 'message is required' }, { status: 400 });
      }

      const normalizedIdempotencyKey = idempotencyKey?.trim() || null;

      // Return prior completed response if this request already ran.
      if (normalizedIdempotencyKey) {
        const existingTurn = await findTurnByIdempotency(pb, userId, sessionId, normalizedIdempotencyKey) as any;
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
            traceId: existingTurn.trace_id || span.spanContext().traceId,
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
      let turn: any;
      try {
        turn = await pb.collection(TURN_COLLECTION).create({
          user_id: userId,
          session_id: sessionId,
          turn_index: turnIndex,
          idempotency_key: normalizedIdempotencyKey,
          status: 'processing',
          request_message_id: messageId,
        });
      } catch (err: unknown) {
        const e = err as { data?: unknown; message?: string };
        console.error('[CONVERSATION_POST] Failed to create turn record:', e.data || e.message || e);
        throw err;
      }

      // If this was a race for the same idempotency key, replay winner's response.
      if (normalizedIdempotencyKey) {
        const duplicateTurn = await findTurnByIdempotency(pb, userId, sessionId, normalizedIdempotencyKey) as any;
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
            traceId: turn.trace_id || span.spanContext().traceId,
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
        turn_id: (turn as any).id,
        message_id: messageId,
      }) as any;

      // Build Memory Context (Ebbinghaus-aware)
      const systemPrompt = await buildMemoryContext(userId);

      // Autonomous Tool Calling Cycle (Phase 3 Hardening: Hybrid Atomic/Streaming)
      // We run tools atomically to maintain context, but stream the FINAL response.
      const messages: OllamaMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message.trim() },
      ];

      let iterations = 0;
      const MAX_ITERATIONS = 3;
      let _finalToolResponse: unknown = null;

      while (iterations < MAX_ITERATIONS) {
        const res = await fetch(`${env.OLLAMA_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: env.OLLAMA_MODEL,
            messages,
            tools: toolRegistry.getToolDefinitions(),
            stream: false,
          }),
        });

        if (!res.ok) throw new Error('Ollama Tool Call API failed');
        const data = await res.json();
        const responseMessage = data.message as OllamaMessage;

        if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
          _finalToolResponse = responseMessage;
          break;
        }

        messages.push(responseMessage);
        for (const toolCall of responseMessage.tool_calls) {
          const result = await executeTool(
            toolCall.function.name,
            toolCall.function.arguments || {},
            ['memory_read', 'memory_write'],
            { userId, sessionId }
          );
          messages.push({ role: 'tool', name: toolCall.function.name, content: JSON.stringify(result) });
        }
        iterations++;
      }

      // ── PHASE 3 STREAMING EXECUTION ──
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let fullReply = "";
          try {
            // Check if we have any tool thoughts before the stream (usually finalToolResponse has the content)
            // But we want to stream the ACTUAL generation of the final message
            for await (const token of streamOllama(message.trim(), messages)) {
              fullReply += token;
              controller.enqueue(encoder.encode(token));
            }
            controller.close();

            // POST-STREAM PERSISTENCE (Backgrounded)
            void (async () => {
              try {
                const twinMessageId = uuidv4();
                await (pb.collection('conversations') as any).create({
                  user_id: userId,
                  session_id: sessionId,
                  role: 'twin',
                  content: fullReply,
                  turn_index: turnIndex,
                  turn_id: (turn as any).id,
                  message_id: twinMessageId,
                });

                await (pb.collection(TURN_COLLECTION) as any).update((turn as any).id, {
                  status: 'completed',
                  response_content: fullReply,
                  user_message_id: userMessageRecord.id,
                  twin_message_id: twinMessageId,
                });

                if (Math.floor(turnIndex / 2) % 5 === 0) {
                  triggerReflection(userId, sessionId).catch(() => {});
                }
              } catch (e) {
                console.error('[POST/STREAM/SAVE] Final persistence error:', e);
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
          'X-Turn-Index': turnIndex.toString(),
          'X-Message-Id': messageId,
          'X-Trace-Id': span.spanContext().traceId,
          'Cache-Control': 'no-store',
        },
      });
    });

  } catch (error: unknown) {
    const err = error as { data?: unknown; message?: string };
    console.error('[API_CONVERSATION_POST] Root failure:', err);
    return NextResponse.json({ 
      error: 'Guardian audit failed', 
      details: err.data || err.message || String(err)
    }, { status: 500 });
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

    console.log('[triggerReflection] Triggering sidecar reflection for session:', sessionId);

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
    }
  } catch (error) {
    console.error('[triggerReflection] Unexpected reflection trigger error', {
      session_id: sessionId,
      user_id: userId,
      error,
    });
  }
}
