import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { auth } from '@clerk/nextjs/server';
import { env } from '@/lib/env';
import { generateDailyOpportunities } from '@/lib/opportunity/generator';
import { calibrateRankerWeights, getRankerWeights } from '@/lib/opportunity/ranker';
import type { ConnectorInput } from '@/lib/opportunity/types';

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const repo = request.nextUrl.searchParams.get('repo') ?? undefined;
  const trends = request.nextUrl.searchParams.get('trends')?.split(',').map((item) => item.trim()).filter(Boolean);
  const focus = request.nextUrl.searchParams.get('focus')?.split(',').map((item) => item.trim()).filter(Boolean);

  const input: ConnectorInput = {
    githubRepo: repo,
    trendKeywords: trends,
    userFocus: focus,
  };

  try {
    const cards = await generateDailyOpportunities(userId, input);
    return NextResponse.json({ generated_at: new Date().toISOString(), cards, weights: getRankerWeights() });
  } catch (error) {
    console.error('[OPPORTUNITIES] generation failed', error);
    return NextResponse.json({ error: 'Failed to generate opportunities' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pb = new PocketBase(env.POCKETBASE_URL);
  pb.autoCancellation(false);

  try {
    const body = await req.json();
    const action = body?.action as 'approve' | 'park' | 'reject' | 'calibrate';

    if (action === 'calibrate') {
      const actualEffort = Number(body?.actual_effort ?? 0);
      const actualValue = Number(body?.actual_value ?? 0);
      const predictedROI = Number(body?.predicted_roi ?? 0);
      const weights = calibrateRankerWeights(actualEffort, actualValue, predictedROI);

      await pb.collection('improvement_proposals').create({
        user_id: userId,
        subsystem: 'opportunity-ranker',
        proposal_type: 'online-calibration',
        hypothesis: 'Ranker weights updated from real PoC outcomes',
        proposed_change: {
          key: 'weights',
          value: weights,
          reason: 'calibrated using actual effort/value',
        },
        status: 'applied',
      });

      return NextResponse.json({ success: true, weights });
    }

    const opportunity = body?.opportunity;
    if (!opportunity || !action) {
      return NextResponse.json({ error: 'Missing action/opportunity' }, { status: 400 });
    }

    if (action === 'approve') {
      const backlogTask = {
        user_id: userId,
        subsystem: 'opportunity-engine',
        proposal_type: 'micro-startup-poc',
        hypothesis: opportunity.problem_statement,
        proposed_change: {
          key: opportunity.id,
          value: {
            target_user: opportunity.target_user,
            roi_score: opportunity.ROI_score,
            first_steps: opportunity.first_PoC_steps,
            evidence: opportunity.evidence,
            subtasks: opportunity.first_PoC_steps.map((step: string, idx: number) => ({
              title: step,
              owner: idx <= 1 ? 'builder' : 'analyst',
              estimate_hours: idx <= 2 ? 4 : 2,
              status: 'todo',
            })),
          },
          reason: 'approved from opportunity deck',
        },
        status: 'pending',
      };

      await pb.collection('improvement_proposals').create(backlogTask);
    }

    if (action === 'park' || action === 'reject') {
      await pb.collection('improvement_proposals').create({
        user_id: userId,
        subsystem: 'opportunity-engine',
        proposal_type: action === 'park' ? 'opportunity-parked' : 'opportunity-rejected',
        hypothesis: opportunity.problem_statement,
        proposed_change: {
          key: opportunity.id,
          value: {
            decision: action,
            roi_score: opportunity.ROI_score,
          },
          reason: 'manual triage from opportunity deck',
        },
        status: action === 'reject' ? 'rejected' : 'pending',
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[OPPORTUNITIES] action failed', error);
    return NextResponse.json({ error: 'Failed to process opportunity action' }, { status: 500 });
  }
}
