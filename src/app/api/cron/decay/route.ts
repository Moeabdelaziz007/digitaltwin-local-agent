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
  let deleted = 0;
  let updated = 0;

  try {
    // Note: We use authStore.save if a service token is required, 
    // but typically cron jobs on Vercel use admin or public list rules.
    const facts = await pb.collection('facts').getFullList<Fact>({
      filter: 'confidence > 0.1',
    });

    for (const fact of facts) {
      processed++;
      
      // ── Step 3: Compute decay ──
      const daysSince = (Date.now() - new Date(fact.updated).getTime()) / 86400000;
      const baseDecay = fact.category === 'biographical' ? 0.05 : 0.15;
      
      // R = e^(-k * t)
      const newConfidence = fact.confidence * Math.exp(-baseDecay * daysSince);
      
      // Reinforcement bonus (slower decay for highly reinforced facts)
      const reinforcementBonus = Math.min((fact.reinforced_count || 0) * 0.02, 0.1);
      const finalConfidence = Math.min(newConfidence + reinforcementBonus, 1.0);

      // ── Step 4 & 5: Persist ──
      if (finalConfidence < 0.15) {
        await pb.collection('facts').delete(fact.id);
        deleted++;
      } else {
        await pb.collection('facts').update(fact.id, {
          confidence: parseFloat(finalConfidence.toFixed(4)),
        });
        updated++;
      }
    }

    return NextResponse.json({
      processed,
      deleted,
      updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[CRON/DECAY] Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
