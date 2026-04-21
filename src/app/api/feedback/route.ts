import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { env } from '@/lib/env';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { traceId, rating, tags, comment, metadata } = body;

    if (!traceId || typeof rating !== 'number') {
      return NextResponse.json({ error: 'Missing traceId or rating' }, { status: 400 });
    }

    const pb = new PocketBase(env.POCKETBASE_URL);
    pb.autoCancellation(false);

    // Create feedback record
    const record = await pb.collection('feedback').create({
      user_id: userId,
      trace_id: traceId,
      rating: rating,
      tags: tags || [],
      comment: comment || '',
      metadata: metadata || {}
    });

    return NextResponse.json({ success: true, id: record.id });
  } catch (error) {
    console.error('[FEEDBACK_API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
