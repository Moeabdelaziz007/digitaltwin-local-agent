import PocketBase from 'pocketbase';
import { env } from '@/lib/env';
import { 
  extractCausalTriples, 
  persistCausalTriples, 
  ExtractorInput 
} from '@/lib/causal/extractor';
import { generateDailyOpportunities } from '@/lib/opportunity/generator';

/**
 * The Meta-Cognitive Loop orchestrates the reflection cycle:
 * 1. Extraction of causal relationships from the latest interaction.
 * 2. Synthesis of strategic opportunities based on user pain points and market signals.
 * 3. Persistence of the generated insights to the backlog.
 */
export async function runMetaCognitiveCycle(userId: string, input: ExtractorInput) {
  const pb = new PocketBase(env.POCKETBASE_URL);
  pb.autoCancellation(false);

  // Authenticate as admin or use service token if needed
  // For now assuming pb-server/client handles auth or it's internal

  try {
    // Phase 1: Causal Extraction & Persistence
    console.log(`[META-LOOP] Starting causal extraction for user: ${userId}`);
    const triples = await extractCausalTriples(input);
    if (triples.length > 0) {
      await persistCausalTriples(pb, userId, triples);
      console.log(`[META-LOOP] Persisted ${triples.length} causal triples.`);
    }

    // Phase 2: Opportunity Generation
    console.log(`[META-LOOP] Generating strategic opportunities...`);
    const opportunities = await generateDailyOpportunities(userId);

    // Phase 3: Persistence of Opportunities to the Backlog
    for (const opp of opportunities) {
      try {
        // Find existing opportunity to avoid duplicates
        let existingId = '';
        try {
          const existing = await pb.collection('opportunities').getFirstListItem(
            `user_id="${userId}" && opportunity_id="${opp.id}"`
          );
          existingId = existing.id;
        } catch {
          // Not found
        }

        const data = {
          user_id: userId,
          opportunity_id: opp.id,
          problem_statement: opp.problem_statement,
          target_user: opp.target_user,
          urgency_score: opp.urgency_score,
          implementation_effort: opp.implementation_effort,
          estimated_value: opp.estimated_value,
          roi_score: opp.ROI_score,
          moat_hint: opp.moat_hint,
          poc_steps: opp.first_PoC_steps,
          why_now: opp.why_now,
          kill_criteria: opp.kill_criteria,
          dependency_risk: opp.dependency_risk,
          legal_uncertainty: opp.legal_privacy_uncertainty,
          data_confidence: opp.data_confidence,
          evidence: JSON.stringify(opp.evidence),
        };

        if (existingId) {
          await pb.collection('opportunities').update(existingId, data);
        } else {
          await pb.collection('opportunities').create(data);
        }
      } catch (err) {
        console.error(`[META-LOOP] Failed to persist opportunity ${opp.id}:`, err);
      }
    }

    return {
      causalTriplesFound: triples.length,
      opportunitiesGenerated: opportunities.length,
    };
  } catch (error) {
    console.error('[META-LOOP] Cycle execution failed:', error);
    throw error;
  }
}
