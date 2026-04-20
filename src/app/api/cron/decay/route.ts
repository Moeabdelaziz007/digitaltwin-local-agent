/**
 * Purpose: Ebbinghaus forgetting curve — simulated memory decay.
 * Schedule: Runs daily at 03:00 UTC (0 3 * * *).
 * Logic: Reduces confidence scores based on elapsed time, with bonuses for reinforcement.
 */

import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import type { Fact } from '@/types/twin';

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://localhost:8090';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  // 1. Validate Secret
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pb = new PocketBase(POCKETBASE_URL);
  pb.autoCancellation(false);

  // ── Step 2: Fetch facts with significant confidence ──
  let processed = 0;
  let archived = 0;
  let updated = 0;

  try {
    const facts = await pb.collection('facts').getFullList<Fact>({
      filter: 'confidence > 0.05 && status != "archived"',
    });

    for (const fact of facts) {
      processed++;

      // ── Step 3: Compute decay ──
      const lastActiveAt = new Date(fact.last_reinforced_at || fact.updated).getTime();
      const daysSince = (Date.now() - lastActiveAt) / 86400000;
      const baseDecay = fact.category === 'biographical' ? 0.04 : 0.11;

      // Reinforcement slows decay significantly over time
      const reinforcementShield = 1 / (1 + Math.log1p(Math.max(fact.reinforced_count || 0, 0)) * 0.85);
      const effectiveDecay = baseDecay * reinforcementShield;

      // Old and non-reinforced facts should fade faster to archive
      const stalePenalty = daysSince > 30 && (fact.reinforced_count || 0) <= 1 ? 0.9 : 1;

      const decayedConfidence = fact.confidence * Math.exp(-effectiveDecay * daysSince) * stalePenalty;
      const finalConfidence = Math.min(parseFloat(decayedConfidence.toFixed(4)), 1.0);

      // ── Step 4 & 5: Persist ──
      if (finalConfidence < 0.08) {
        await pb.collection('facts').update(fact.id, {
          confidence: finalConfidence,
          status: 'archived',
        });
        archived++;
      } else {
        await pb.collection('facts').update(fact.id, {
          confidence: finalConfidence,
        });
        updated++;
      }
    }

    return NextResponse.json({
      processed,
      archived,
      updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[CRON/DECAY] Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
