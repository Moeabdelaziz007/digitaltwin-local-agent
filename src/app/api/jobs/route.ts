import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { jobsService, JobType } from '@/lib/jobs/jobs-service';

/**
 * POST /api/jobs
 * Enqueue a background task.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, payload, user_id: requestedUserId } = body;

    // 1. Validation
    if (!type || !requestedUserId) {
      return NextResponse.json({ error: 'Missing type or user_id' }, { status: 400 });
    }

    // 2. Security: Ensure user can only enqueue jobs for themselves
    if (requestedUserId !== clerkUserId) {
       return NextResponse.json({ error: 'Forbidden: Cannot enqueue jobs for other users' }, { status: 403 });
    }

    const supportedTypes: JobType[] = ['RESEARCH_TASK', 'EVAL_RUN', 'MEMORY_MAINTENANCE', 'PROFILE_SNAPSHOT'];
    if (!supportedTypes.includes(type)) {
      return NextResponse.json({ error: `Unsupported job type: ${type}` }, { status: 400 });
    }

    // 3. Enqueue
    const jobId = await jobsService.enqueue(clerkUserId, type, payload || {});

    return NextResponse.json({
      accepted: true,
      jobId,
      status: 'queued',
      message: `${type} has been accepted and added to the processing queue.`
    }, { status: 202 });

  } catch (error) {
    console.error('[JOBS_API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
