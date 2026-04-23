/**
 * src/app/api/quantum-mirror/simulate/route.ts
 * 
 * 🪞 Simulation API
 * 
 * تشغيل محاكاة كاملة لمهمة معينة
 */

import { NextRequest, NextResponse } from 'next/server';
import { quantumMirror } from '@/lib/quantum-mirror/core/quantum-engine';
import { ventureRegistry } from '@/lib/holding/venture-registry';
import { getAuth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { parentAgentId, task, ventureId } = body;

    if (!parentAgentId || !task) {
      return NextResponse.json({ 
        error: 'Missing required fields: parentAgentId, task' 
      }, { status: 400 });
    }

    // إيجاد الـ venture
    let venture = ventureId ? ventureRegistry.getVenture(ventureId) : null;
    if (!venture) {
      const ventures = ventureRegistry.listVentures();
      venture = ventures.find(v => v.status === 'active') || ventures[0];
    }

    if (!venture) {
      return NextResponse.json({ 
        error: 'No active venture found' 
      }, { status: 400 });
    }

    // تشغيل المحاكاة
    const startTime = Date.now();
    const result = await quantumMirror.simulate(parentAgentId, task, venture);

    return NextResponse.json({
      success: true,
      simulation: {
        recommendation: result.recommendation,
        expectedRevenue: result.expectedRevenue,
        expectedRisk: result.expectedRisk,
        overallConfidence: result.overallConfidence,
        reasoning: result.reasoning,
        topPaths: result.topPaths.map(p => ({
          path: p.path,
          outcome: p.outcome,
          revenue: p.revenue,
          riskScore: p.riskScore,
          confidence: p.confidence,
        })),
      },
      meta: {
        ventureName: venture.name,
        parentAgentId,
        taskPreview: task.slice(0, 100),
        latencyMs: Date.now() - startTime,
      },
    });

  } catch (error) {
    console.error('[SimulationAPI] Error:', error);
    return NextResponse.json({ 
      error: 'Simulation failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
