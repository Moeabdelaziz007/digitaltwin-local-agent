/**
 * src/lib/holding/test-ahp.ts
 * ملف اختبار لتكامل نظام AHP.
 * يقوم بمحاكاة دورة حياة تذكرة عمل من البداية للنهاية.
 */

import { Venture, Ticket } from './types';
import { CORE_ROLES } from './org-chart';
import { VentureOrchestrator } from '../consensus/venture-orchestrator';

async function testAHPCycle() {
  console.log('🚀 Starting AHP Integration Test...');

  // 1. إنشاء مشروع وهمي
  const mockVenture: Venture = {
    id: 'v-test-001',
    name: 'SaaS Profit Lab',
    vision: 'Build a profitable AI note-taking app with $10k MRR.',
    mission_statement: 'Generate profit via autonomous AI workflows.',
    status: 'active',
    budget: {
      monthly_limit_usd: 1000,
      spent_this_month_usd: 0,
      token_limit: 1000000,
      spent_tokens: 0
    },
    org_chart: CORE_ROLES,
    goals: [
      { id: 'g1', title: 'Market Research', description: 'Analyze top 5 AI note apps.', status: 'in_progress' }
    ],
    created_at: new Date().toISOString(),
    metadata: {}
  };

  // 2. إنشاء تذكرة عمل وهمية للـ CTO
  const mockTicket: Ticket = {
    id: 't-test-001',
    venture_id: mockVenture.id,
    title: 'Technical Spec for AI Sync',
    assigned_role_id: 'role-cto', // الـ CTO هو المسؤول
    status: 'todo',
    priority: 'high',
    context: 'Design the technical architecture for syncing local notes with a distributed vector database.',
    budget_allocated: 5.0,
    audit_trail: ['Created by Test Runner'],
    created_at: new Date().toISOString()
  };

  try {
    console.log(`[Test] Executing Ticket: ${mockTicket.title} for Role: ${mockTicket.assigned_role_id}`);
    
    // 3. التنفيذ عبر المنسق
    const result = await VentureOrchestrator.executeTicket(mockVenture, mockTicket);
    
    console.log('✅ Ticket Execution Result:');
    console.log(result);
    
  } catch (error) {
    console.error('❌ Test Failed:', error);
  }
}

// تنفيذ الاختبار إذا تم تشغيل الملف مباشرة
if (require.main === module) {
  testAHPCycle().catch(console.error);
}

export { testAHPCycle };
