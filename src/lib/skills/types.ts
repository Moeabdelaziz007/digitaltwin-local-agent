/**
 * src/lib/skills/types.ts
 * Core types for MAS-ZERO Skill Execution
 */

export interface ExecutionResult {
  success: boolean;
  output: string;
  data?: any;
  ticketId?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface UpworkJob {
  id: string;
  title: string;
  description: string;
  budget?: number;
  posted_at?: string;
}
