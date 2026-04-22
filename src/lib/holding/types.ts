/**
 * src/lib/holding/types.ts
 * القواعد الأساسية لبروتوكول القابضة المستقلة (AHP)
 * يحدد هذا الملف هيكل "الشركة" وليس مجرد "الوكلاء".
 */

export type VentureStatus = 'active' | 'paused' | 'liquidated' | 'stealth';
export type DepartmentType = 'engineering' | 'revenue' | 'distribution' | 'governance' | 'risk';

export interface Budget {
  monthly_limit_usd: number;
  spent_this_month_usd: number;
  token_limit: number;
  spent_tokens: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  target_mrr?: number;
  deadline?: string;
  status: 'in_progress' | 'achieved' | 'failed';
  parent_goal_id?: string; // لتمكين الهيكل الهرمي للأهداف
}

export interface Role {
  id: string;
  title: string; // CEO, CTO, Rainmaker, etc.
  description: string;
  assigned_agent_id: string;
  department: DepartmentType;
  capabilities: string[]; // قائمة بالمهارات (Skills) المسموح بها لهذا الدور
  budget_limit_per_task: number;
  provider_hint?: 'ollama' | 'groq' | 'openai' | 'claude' | 'gemini'; // درس Hermes: تعدد المزودين
}

export interface Venture {
  id: string;
  name: string;
  vision: string;
  status: VentureStatus;
  budget: Budget;
  org_chart: Role[];
  goals: Goal[];
  created_at: string;
  metadata: Record<string, any>;
}

export interface Ticket {
  id: string;
  venture_id: string;
  title: string;
  assigned_role_id: string;
  status: 'todo' | 'in_progress' | 'qa' | 'done' | 'blocked';
  priority: 'critical' | 'high' | 'medium' | 'low';
  context: string;
  budget_allocated: number;
  output?: string;
  audit_trail: string[]; // سجل تاريخي لكل ما حدث في التذكرة
}
