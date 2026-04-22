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
  daily_limit_usd?: number; // سقف يومي
  spent_today_usd?: number;
  hourly_limit_usd?: number; // سقف ساعي
  spent_this_hour_usd?: number;
  token_limit: number;
  spent_tokens: number;
  last_reset_day?: string; // ISO date
  last_reset_hour?: string; // ISO timestamp
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
  reporting_to_role_id?: string; // خط التقارير (إلى من يتبع هذا الدور)
}

export type VentureStage = 'ideation' | 'prototype' | 'mvp' | 'beta' | 'scaling' | 'mature' | 'pivot';

export interface Venture {
  id: string;
  name: string;
  vision: string;
  mission_statement: string; // الهدف الأسمى (Money Machine Focus)
  status: VentureStatus;
  budget: Budget;
  org_chart: Role[];
  goals: Goal[];
  created_at: string;
  skills?: string[]; // قائمة بالمهارات المسجلة لهذه الشركة
  metadata: Record<string, any>;
}

export interface Ticket {
  id: string;
  venture_id: string;
  assigned_role_id: string;
  title: string;
  context: string;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
  output?: string;
  created_at: string;
  updated_at: string;
  metadata?: {
    model?: string;
    tokens?: number;
    [key: string]: any;
  };
}
