/**
 * Purpose: Weekly profile snapshot — optimizes the Twin's core personality.
 * Schedule: Runs every Sunday at 02:00 UTC (0 2 * * 0).
 * Logic: Aggregates top 10 highest-confidence facts for every user into a snapshot.
 */

import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import type { UserProfile, Fact, ProfileSnapshot } from '@/types/twin';

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://localhost:8090';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  
  // 1. Validate Secret
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pb = new PocketBase(POCKETBASE_URL);
  pb.autoCancellation(false);

  let snapshotted = 0;

  try {
    // ── Step 2: Fetch all user profiles ──
    const profiles = await pb.collection('user_profiles').getFullList<UserProfile>();

    for (const profile of profiles) {
      // ── Step 3a: Fetch top 10 facts by confidence ──
      const factsResult = await pb.collection('facts').getList<Fact>(1, 10, {
        filter: `user_id = "${profile.user_id}"`,
        sort: '-confidence',
      });

      // ── Step 3b: Build new snapshot ──
      // Preserve existing adaptations if they exist
      const existingSnapshot: Partial<ProfileSnapshot> = profile.profile_snapshot || {};
      
      const newSnapshot: ProfileSnapshot = {
        adaptations: existingSnapshot.adaptations || {
          tone: profile.tone || 'balanced',
          detail_level: 'balanced',
          humor: 'moderate',
        },
        top_facts: factsResult.items.map(f => f.fact),
        last_updated: new Date().toISOString(),
      };

      // ── Step 3c: Update profile record ──
      await pb.collection('user_profiles').update(profile.id, {
        profile_snapshot: newSnapshot,
      });
      
      snapshotted++;
    }

    return NextResponse.json({
      snapshotted,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[CRON/SNAPSHOT] Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
