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
import { v4 as uuidv4 } from 'uuid';
import type { ConversationRequest } from '@/types/twin';
import crypto from 'crypto';

// SIDECAR_URL is resolved inside triggerReflection() to avoid stale module-level state

/**
 * Server-side PocketBase client (data layer only, no auth forwarding)
 */
function getServerPB(): PocketBase {
  if (!process.env.POCKETBASE_URL) throw new Error('POCKETBASE_URL environment variable is required');
  const pb = new PocketBase(process.env.POCKETBASE_URL);
  pb.autoCancellation(false);
  return pb;
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
 * PHASE 1: Sequential Turn Index
 * Fetches the next available turn index for a session.
 */
async function getNextTurnIndex(pb: PocketBase, sessionId: string): Promise<number> {
  try {
    const lastRecord = await pb.collection('conversations').getFirstListItem(`session_id="${sessionId}"`, {
      sort: '-turn_index',
    });
    return (lastRecord.turn_index || 0) + 1;
  } catch {
    return 1;
  }
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
            const nextIndex = await getNextTurnIndex(pb, sessionId);

            // Save User message
            await pb.collection('conversations').create({
              user_id: userId,
              session_id: sessionId,
              role: 'user',
              content: message,
              turn_index: nextIndex,
            });

            // Save Twin response
            await pb.collection('conversations').create({
              user_id: userId,
              session_id: sessionId,
              role: 'twin',
              content: fullReply,
              turn_index: nextIndex + 1,
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
    const { message, sessionId: existingSessionId } = body;
    const sessionId = existingSessionId || uuidv4();
    const pb = getServerPB();
    const userId = clerkUserId;

    if (!userId || !message?.trim()) {
      return NextResponse.json({ error: 'userId and message are required' }, { status: 400 });
    }

    // ── Step 1: Manage turn count ──
    let turnIndex = 0;
    try {
      const countResult = await pb.collection('conversations').getList(1, 1, {
        filter: `user_id = "${userId}" && session_id = "${sessionId}"`,
        sort: '-turn_index',
      });
      turnIndex = countResult.items.length > 0 ? (countResult.items[0].turn_index || 0) + 1 : 0;
    } catch { turnIndex = 0; }

    // ── Step 2: Save User message ──
    await pb.collection('conversations').create({
      user_id: userId,
      session_id: sessionId,
      role: 'user',
      content: message.trim(),
      turn_index: turnIndex,
    });

    // ── Step 3: Build Memory Context (Ebbinghaus-aware) ──
    const systemPrompt = await buildMemoryContext(userId);

    // ── Step 4: Autonomous Tool Calling Cycle ──
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

    // ── Step 5: Save Twin reply ──
    await pb.collection('conversations').create({
      user_id: userId,
      session_id: sessionId,
      role: 'twin',
      content: reply,
      turn_index: turnIndex + 1,
    });

    // ── Step 6: Trigger Reflection ──
    if (Math.floor(turnIndex / 2) % 5 === 0) {
      triggerReflection(userId, sessionId).catch(() => {});
    }

    // ── Step 7: Response DTO with ETag ──
    const etag = crypto.createHash('md5').update(reply + sessionId + turnIndex).digest('hex').slice(0, 16);

    return NextResponse.json({
      reply,
      sessionId,
      turnIndex: turnIndex + 1,
    }, {
      headers: {
        'ETag': `"${etag}"`,
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
  const SIDECAR_URL = process.env.SIDECAR_URL;
  const SIDECAR_SECRET = process.env.SIDECAR_SECRET || 'dev_secret_only';
  if (!SIDECAR_URL) return;

  const payload = { user_id: userId, session_id: sessionId, timestamp: Date.now() };
  const signature = generateSignature(payload, SIDECAR_SECRET);

  try {
    const response = await fetch(`${SIDECAR_URL}/reflect`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Twin-Signature': signature, // PHASE 2: Signed Requests
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000), // STEP 3: 5-second timeout
    });

    if (!response.ok) {
      throw new Error(`Sidecar responded with code: ${response.status}`);
    }
  } catch (error) {
    // STEP 3: Log to Sentry with context but do not throw
    console.warn('[CONVERSATION/REFLECTION] Silent Failure:', error);
    Sentry.captureException(error, {
      tags: { context: 'sidecar-reflection', userId },
      extra: { sessionId, errorMsg: (error as Error).message }
    });
  }
}
