import { Venture, Role, Ticket } from '../holding/types';

/**
 * src/lib/skills/types.ts
 * Core types and Base Classes for MAS-ZERO Skill Execution
 */

export interface ExecutionResult {
  success: boolean;
  output: string;
  data?: any;
  ticketId?: string;
  error?: string;
  estimatedRevenue?: number;
  metadata?: Record<string, any>;
  verified?: boolean;
}

export interface SkillMetadata {
  id?: string;
  name: string;
  version: string;
  description: string;
  category?: string;
  revenue_impact: 'low' | 'medium' | 'high' | 'critical';
  permissions: string[];
  required_tools: string[];
  when_to_use?: string;
  successRate?: number;
  totalEarnings?: number;
  invocation_flow?: string[];
}

/**
 * ISkill: The Unified Plugin Interface for Venture OS
 */
export abstract class ISkill {
  abstract id: string;
  abstract metadata: SkillMetadata;
  public instructions?: string;

  /**
   * 1. Discovery (اكتشاف الفرص)
   */
  async scan(): Promise<any[]> { return []; }

  /**
   * 2. Score (تقييم المخاطر والأرباح)
   */
  async score(items: any[], venture: Venture): Promise<any[]> { return items; }

  /**
   * 3. Generate (توليد مسودة العمل)
   */
  async generate(bestOpportunity: any): Promise<any> { return bestOpportunity; }

  /**
   * 6. EXECUTE (التنفيذ الفعلي عبر الـ Kernel)
   */
  abstract execute(venture: Venture, role: Role, ticket?: Ticket): Promise<ExecutionResult>;

  /**
   * 7. VERIFY (التحقق من النتيجة)
   */
  async verify(result: ExecutionResult): Promise<boolean> { return result.success; }

  /**
   * 8. LEARN (التعلم والتحسين)
   */
  async learn(outcome: ExecutionResult, venture: Venture): Promise<void> {}
}

// Compatibility Alias
export const BaseSkill = ISkill;

export interface UpworkJob {
  id: string;
  title: string;
  description: string;
  budget?: number;
  posted_at?: string;
}
