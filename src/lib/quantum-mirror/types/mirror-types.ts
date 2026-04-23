/**
 * src/lib/quantum-mirror/types/mirror-types.ts
 * أنواع المرايا الكمية - Quantum Mirror Types
 */

export type MirrorPersonaVariant = 'bull' | 'bear' | 'chaos' | 'conservative' | 'aggressive';

export type MirrorStatus = 'spawning' | 'simulating' | 'completed' | 'terminated' | 'promoted';

export interface MirrorMeta {
  parentRealAgentId: string;        // الوكيل الحقيقي الأب
  personaVariant: MirrorPersonaVariant;  // نوع الشخصية
  simulationDepth: number;          // عمق المحاكاة (أشهر)
  accuracyHistory: number[];        // تاريخ دقة التوقعات (0-1)
  promotionScore: number;           // درجة الترقية (0-10)
  totalSimulations: number;         // عدد المحاكيات المنفذة
  successfulSimulations: number;    // عدد المحاكيات الناجحة
  spawnedAt: string;                // وقت الإنشاء
  terminatedAt?: string;            // وقت الإنهاء
  promotedAt?: string;              // وقت الترقية
  lastSimulationAt?: string;        // آخر محاكاة
}

export interface SimulationResult {
  mirrorId: string;
  path: string[];                   // المسار المتوقع
  outcome: 'success' | 'failure' | 'partial';
  revenue: number;                  // الإيرادات المتوقعة
  riskScore: number;                // درجة المخاطر (0-100)
  timeToCompletion: number;         // الوقت المتوقع (أيام)
  confidence: number;               // ثقة المرآة (0-1)
  reasoning: string;                // التبرير
  metadata?: Record<string, any>;
}

export interface MirrorPool {
  id: string;
  parentAgentId: string;
  mirrors: string[];                // قائمة معرفات المرايا
  createdAt: string;
  status: 'active' | 'archived';
  totalBudget: number;              // ميزانية الـ pool (عادة $0 للمحلي)
  usedBudget: number;
}

export interface PromotionCandidate {
  mirrorId: string;
  promotionScore: number;
  accuracyRate: number;
  totalSimulations: number;
  recommendedRole: string;
  recommendedCapabilities: string[];
  cautionRules: string[];
}
