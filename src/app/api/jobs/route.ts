import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';

type JobsPayload = {
  type?: unknown;
  user_id?: unknown;
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: JobsPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const type = body.type;
  const requestedUserId = body.user_id;

  if (type !== 'RESEARCH_TASK') {
    return NextResponse.json({ error: 'Unsupported job type' }, { status: 400 });
  }

  if (typeof requestedUserId !== 'string' || requestedUserId.length === 0) {
    return NextResponse.json({ error: 'Missing or invalid user_id' }, { status: 400 });
  }

  if (requestedUserId !== userId) {
    return NextResponse.json({ error: 'Forbidden user_id' }, { status: 403 });
  }

  const jobId = randomUUID();

  // Safe placeholder enqueue (non-blocking): keeps UX functional while queue worker is wired.
  console.info('[JOBS_API] Accepted placeholder research job', {
    jobId,
    type,
    userId,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json(
    {
      accepted: true,
      job: {
        id: jobId,
        type,
        user_id: userId,
        status: 'queued_placeholder',
      },
      message: 'Research job accepted (placeholder queue).',
    },
    { status: 202 },
  );
}
