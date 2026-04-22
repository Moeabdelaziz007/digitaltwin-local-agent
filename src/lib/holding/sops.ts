/**
 * src/lib/holding/sops.ts
 * إجراءات العمل القياسية (SOPs): الدليل الإرشادي لكل قسم لاتخاذ القرارات.
 */

import { DepartmentType } from './types';

export interface SOP {
  department: DepartmentType;
  steps: string[];
  verification_rules: string[];
}

export const CORPORATE_SOPS: SOP[] = [
  {
    department: 'engineering',
    steps: [
      '1. تحليل متطلبات التذكرة تقنياً.',
      '2. إنشاء خطة تنفيذ مصغرة (Small Parts).',
      '3. كتابة الكود مع الالتزام بمعايير Clean Code.',
      '4. إجراء اختبارات الوحدات (Unit Tests).'
    ],
    verification_rules: [
      'يجب أن يمر الكود من فحص TypeScript.',
      'يجب ألا يحتوي الكود على بيانات حساسة (Secrets).'
    ]
  },
  {
    department: 'revenue',
    steps: [
      '1. تحديد القنوات الأكثر ربحية (ROI).',
      '2. البحث عن ثغرات في السوق (Market Gaps).',
      '3. إعداد حملة توزيع أو جذب عملاء.'
    ],
    verification_rules: [
      'يجب أن يكون العائد المتوقع أكبر من تكلفة التنفيذ.'
    ]
  },
  {
    department: 'risk',
    steps: [
      '1. فحص المخرجات من الأقسام الأخرى.',
      '2. تنظيف أي بيانات شخصية (PII).',
      '3. التأكد من عدم وجود ثغرات أمنية.'
    ],
    verification_rules: [
      'يجب تمرير كافة المخرجات عبر فلتر الخصوصية قبل العرض على المستخدم.'
    ]
  }
];

export function getSOPByDepartment(dept: DepartmentType): SOP | undefined {
  return CORPORATE_SOPS.find(s => s.department === dept);
}
