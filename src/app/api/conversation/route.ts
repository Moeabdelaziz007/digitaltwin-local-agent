// /api/conversation — Dual-Mode Chat Endpoint (Streaming + Tool-Calling)
//
// GET:  Real-time streaming (Optimized for Web UI consumption)
// POST: Atomic, tool-augmented logic (Optimized for structured UI/Reflection)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { streamOllama } from '@/lib/ollama-client';
import { kernel } from '@/lib/kernel/core-kernel';
import { v4 as uuidv4 } from 'uuid';
import type { ConversationRequest } from '@/types/twin';
import { env } from '@/lib/env';
import { createHmac } from 'crypto';
import { safeFetch } from '@/lib/safe-fetch';

const asPbUserId = (identity: string) => identity.trim();
const GUARDIAN_USER_ID = 'system_guardian';

/**
 * FEATURE 1 — GET: Real-time Streaming Endpoint
 */
export async function GET(request: NextRequest) {
  // Keeping GET simple for now, but it should also eventually call the Kernel
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const userId = asPbUserId(clerkUserId);
  const { searchParams } = new URL(request.url);
  const message = searchParams.get('message');
  const sessionId = searchParams.get('sessionId') || uuidv4();

  if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const token of streamOllama(message, [{ role: 'user', content: message }])) {
          controller.enqueue(encoder.encode(token));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

/**
 * FEATURE 2 — POST: Kernel-Powered Dispatcher
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
    const { message, sessionId: existingSessionId, idempotencyKey } = body;
    const sessionId = existingSessionId || uuidv4();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    // --- KERNEL DISPATCH ---
    const result = await kernel.processUserRequest({
      userId,
      sessionId,
      message,
      idempotencyKey
    });

    // Handle Idempotent Replay
    if ((result as any).replay) {
      const replay = (result as any).replay;
      return NextResponse.json({
        reply: replay.response_content,
        sessionId,
        turnIndex: replay.turn_index,
        messageId: replay.request_message_id,
        turnId: replay.id,
        traceId: replay.trace_id,
        idempotentReplay: true,
      });
    }

    const { turn, turnIndex, messageId, context, traceId } = result as any;

    // --- STREAMING RESPONSE ---
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullReply = "";
        try {
          for await (const token of streamOllama(message.trim(), context)) {
            fullReply += token;
            controller.enqueue(encoder.encode(token));
          }
          controller.close();

          // Finalize Turn in Background
          kernel.finalizeTurn(turn.id, userId, sessionId, turnIndex, fullReply).catch(console.error);
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
        'X-Trace-Id': traceId,
        'Cache-Control': 'no-store',
      },
    });

  } catch (error: unknown) {
    console.error('[API_CONVERSATION_POST] Failure:', error);
    return NextResponse.json({ error: 'Kernel processing failed' }, { status: 500 });
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
    const signature = createHmac('sha256', secret)
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
