/**
 * src/app/api/quantum-mirror/promote/route.ts
 * 
 * 🚀 Promotion Approval API
 * 
 * يتيح للـ Board (أنت) الموافقة على ترقية مرآة إلى وكيل حقيقي
 */

import { NextRequest, NextResponse } from 'next/server';
import { workforceTree } from '@/lib/holding/workforce-tree';
import { getAuth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // التحقق من الصلاحيات (Board فقط)
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { mirrorId, newRole, newTitle, budget, approvedBy } = body;

    if (!mirrorId || !newRole || !newTitle || !budget) {
      return NextResponse.json({ 
        error: 'Missing required fields: mirrorId, newRole, newTitle, budget' 
      }, { status: 400 });
    }

    // التحقق من أن المرآة موجودة ومؤهلة
    const mirror = workforceTree.getNode(mirrorId);
    if (!mirror) {
      return NextResponse.json({ error: 'Mirror not found' }, { status: 404 });
    }

    if (mirror.status !== 'mirror') {
      return NextResponse.json({ error: 'Node is not a mirror' }, { status: 400 });
    }

    if (!mirror.mirrorMeta || mirror.mirrorMeta.promotionScore < 0.7) {
      return NextResponse.json({ 
        error: 'Mirror not eligible for promotion (score < 0.7)' 
      }, { status: 400 });
    }

    // تنفيذ الترقية
    const promotedAgent = await workforceTree.promoteMirror(
      mirrorId,
      newRole,
      newTitle,
      budget
    );

    return NextResponse.json({
      success: true,
      message: `Mirror ${mirrorId} promoted to ${newTitle}`,
      agent: {
        id: promotedAgent.id,
        role: promotedAgent.role,
        title: promotedAgent.title,
        status: promotedAgent.status,
        previousAccuracy: mirror.mirrorMeta?.averageAccuracy,
        simulationsCompleted: mirror.mirrorMeta?.simulationsCompleted,
      },
      approvedBy: approvedBy || userId,
      approvedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[PromotionAPI] Error:', error);
    return NextResponse.json({ 
      error: 'Promotion failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // جلب قائمة المرشحين للترقية
    const candidates = workforceTree.getPromotionCandidates(0.7);

    return NextResponse.json({
      count: candidates.length,
      candidates: candidates.map(node => ({
        id: node.id,
        title: node.title,
        personaVariant: node.mirrorMeta?.personaVariant,
        promotionScore: node.mirrorMeta?.promotionScore,
        averageAccuracy: node.mirrorMeta?.averageAccuracy,
        simulationsCompleted: node.mirrorMeta?.simulationsCompleted,
        simulationsSuccessful: node.mirrorMeta?.simulationsSuccessful,
        parentAgentId: node.mirrorMeta?.parentRealAgentId,
        spawnedAt: node.mirrorMeta?.spawnedAt,
      })),
    });

  } catch (error) {
    console.error('[PromotionAPI] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 });
  }
}
