/**
 * src/lib/holding/org-chart.ts
 * تعريف الهيكل التنظيمي للأدوار القيادية في الشركات المستقلة.
 */

import { Role, DepartmentType } from './types';

export const CORE_ROLES: Role[] = [
  {
    id: 'role-ceo',
    title: 'Chief Executive Officer (CEO)',
    description: 'المسؤول عن الرؤية الاستراتيجية، اتخاذ القرارات الكبرى، وضمان ربحية المشروع.',
    assigned_agent_id: 'agent-meta-architect', // نستخدم الوكيل المعماري كمدير تنفيذي
    department: 'governance',
    capabilities: ['strategic_planning', 'budget_allocation', 'venture_audit'],
    budget_limit_per_task: 50.0 // 50 دولار كحد أقصى للمهمة الواحدة
  },
  {
    id: 'role-cto',
    title: 'Chief Technology Officer (CTO)',
    description: 'المسؤول عن البناء التقني، جودة الكود، واختيار التقنيات المناسبة.',
    assigned_agent_id: 'agent-coder',
    department: 'engineering',
    capabilities: ['code_generation', 'system_design', 'technical_audit'],
    budget_limit_per_task: 20.0
  },
  {
    id: 'role-rainmaker',
    title: 'Growth & Revenue Manager (Rainmaker)',
    description: 'المسؤول عن التوزيع، التسويق، وجلب العملاء أو الإيرادات.',
    assigned_agent_id: 'agent-hunter',
    department: 'revenue',
    capabilities: ['market_research', 'lead_generation', 'distribution_ops'],
    budget_limit_per_task: 30.0
  },
  {
    id: 'role-guardian',
    title: 'Security & Privacy Guardian',
    description: 'المسؤول عن حماية البيانات، فلترة الخصوصية (PII)، وضمان أمن النظام.',
    assigned_agent_id: 'agent-risk-manager',
    department: 'risk',
    capabilities: ['pii_scrubbing', 'security_audit', 'safety_verification'],
    budget_limit_per_task: 10.0
  }
];

/**
 * وظيفة لاسترجاع الدور بناءً على المعرف
 */
export function getRoleById(roleId: string): Role | undefined {
  return CORE_ROLES.find(r => r.id === roleId);
}
