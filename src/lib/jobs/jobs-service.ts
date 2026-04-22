import { getServerPB } from '@/lib/pb-server';
import { randomUUID } from 'crypto';

export type JobType = 'RESEARCH_TASK' | 'EVAL_RUN' | 'MEMORY_MAINTENANCE' | 'PROFILE_SNAPSHOT';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface BackgroundJob {
  id: string;
  type: JobType;
  user_id: string;
  status: JobStatus;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  created: string;
  updated: string;
}

/**
 * JobsService
 * Logic for background task orchestration using PocketBase as a persistent queue.
 */
export const jobsService = {
  /**
   * Enqueue a new job
   */
  async enqueue(userId: string, type: JobType, payload: Record<string, unknown> = {}): Promise<string> {
    const pb = getServerPB();
    const jobId = randomUUID();
    
    await pb.collection('background_jobs').create({
      job_id: jobId,
      user_id: userId,
      type,
      status: 'queued',
      payload,
    });

    console.info(`[JOBS] Enqueued ${type} for user ${userId} (ID: ${jobId})`);
    return jobId;
  },

  /**
   * Get job status
   */
  async getJob(jobId: string): Promise<BackgroundJob | null> {
    const pb = getServerPB();
    try {
      const record = await pb.collection('background_jobs').getFirstListItem(`job_id="${jobId}"`);
      return record as unknown as BackgroundJob;
    } catch {
      return null;
    }
  },

  /**
   * Update job status (used by worker/cron)
   */
  async updateStatus(jobId: string, status: JobStatus, updates: Partial<BackgroundJob> = {}) {
    const pb = getServerPB();
    try {
      const record = await pb.collection('background_jobs').getFirstListItem(`job_id="${jobId}"`);
      await pb.collection('background_jobs').update(record.id, {
        status,
        ...updates,
      });
    } catch (err) {
      console.error(`[JOBS] Failed to update job ${jobId}:`, err);
    }
  }
};
