// ============================================================
// Agent Skill Type Definitions
// ============================================================

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  status?: string;
  tags?: string[];
  lastUsed?: string;
  cost?: string;
  successRate?: number;
  totalEarnings?: number;
  requiredEnvVars?: string[];
  metadata?: {
    avgDurationMs: number;
    successRate: number;
  };
  stats?: {
    totalRuns: number;
    avgDurationMs: number;
  };
  execute?: (context: any) => Promise<any>;
}

export interface DigitalTwinProfile {
  user_id: string;
  display_name: string;
  skills: string[];
  interests: string[];
  personality_desc: string;
}

export interface UpworkJob {
  id: string;
  title: string;
  description: string;
  budget: number;
  skills_required: string[];
}

export interface BountyIssue {
  id: string;
  title: string;
  body: string;
  bounty_amount: number;
  repo: string;
}

export interface MarketSignal {
  keyword: string;
  momentum: number;
  headline: string;
  sourceUrl?: string;
  confidence: number;
}

export interface ContentPiece {
  title: string;
  content: string;
  platform: string;
  tags: string[];
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  duration_ms?: number;
  metadata?: Record<string, any>;
}
