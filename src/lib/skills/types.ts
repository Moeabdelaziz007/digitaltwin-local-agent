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
}

/**
 * The 8-Step Lifecycle Enforcer
 */
export abstract class BaseSkill {
  abstract id: string;

  /**
   * 1. Discovery (اكتشاف الفرص)
   */
  abstract scan(): Promise<any[]>;

  /**
   * 2. Score (تقييم المخاطر والأرباح)
   */
  abstract score(items: any[], venture: Venture): Promise<any[]>;

  /**
   * 3. Generate (توليد مسودة العمل)
   */
  abstract generate(bestOpportunity: any): Promise<any>;

  /**
   * 4. TICKET (إنشاء تذكرة الحوكمة)
   * 5. APPROVE (انتظار الموافقة)
   * 6. EXECUTE (التنفيذ الفعلي)
   */
  abstract execute(venture: Venture, role: Role, ticket?: Ticket): Promise<ExecutionResult>;

  /**
   * 7. VERIFY (التحقق من النتيجة)
   */
  abstract verify(result: ExecutionResult): Promise<boolean>;

  /**
   * 8. LEARN (التعلم والتحسين)
   */
  abstract learn(outcome: ExecutionResult, venture: Venture): Promise<void>;
}

export interface UpworkJob {
  id: string;
  title: string;
  description: string;
  budget?: number;
  posted_at?: string;
}
