/**
 * src/lib/quantum-mirror/feedback/feedback-forge.ts
 * 
 * 🔥 Feedback Forge — مصنع التغذية الراجعة
 * 
 * يقارن نتائج المحاكاة بالواقع ويولّد طفرات من الفشل.
 * يحتاج موافقة Board قبل ترقية أي مرآة.
 */

import { callOllama } from '@/lib/ollama-client';
import { workforceTree } from '@/lib/holding/workforce-tree';
import { tieredMemory } from '@/lib/memory/tiered-store';
import { JSONHardener } from '@/lib/utils/json-hardener';
import type { SimulationResult, CompressedSimulation, PromotionRequest } from '../types/mirror-types';

export interface ForgeResult {
  accuracyScore: number;
  bestMirrorId: string | null;
  mutationSpawned: boolean;
  promotionCandidates: PromotionRequest[];
  archived: boolean;
}

export class FeedbackForge {
  private static instance: FeedbackForge;

  private constructor() {}

  public static getInstance(): FeedbackForge {
    if (!FeedbackForge.instance) {
      FeedbackForge.instance = new FeedbackForge();
    }
    return FeedbackForge.instance;
  }

  /**
   * 🔥 Main: Process feedback after real execution
   * معالجة التغذية الراجعة بعد التنفيذ الحقيقي
   */
  public async forge(
    parentAgentId: string,
    simulations: SimulationResult[],
    actualResult: SimulationResult
  ): Promise<ForgeResult> {
    console.log(`[FeedbackForge] 🔥 Processing feedback for agent: ${parentAgentId}`);

    // 1. إيجاد أدق مرآة
    const bestMirror = this.findBestMirror(simulations, actualResult);

    // 2. حساب دقة كل مرآة وتحديث أدائها
    const accuracyScore = await this.updateMirrorAccuracies(simulations, actualResult);

    // 3. إذا فشل الواقع → توليد طفرة
    let mutationSpawned = false;
    if (actualResult.outcome === 'failure' && actualResult.riskScore > 70) {
      mutationSpawned = await this.spawnMutation(parentAgentId, actualResult);
    }

    // 4. فحص مرشحي الترقية
    const promotionCandidates = this.checkPromotionCandidates(parentAgentId);

    // 5. أرشفة في الذاكرة
    await this.archiveToMemory(parentAgentId, simulations, actualResult, accuracyScore);

    return {
      accuracyScore,
      bestMirrorId: bestMirror?.mirrorId || null,
      mutationSpawned,
      promotionCandidates,
      archived: true,
    };
  }

  // ─── Private: Find Best Mirror ──────────────────────────────────────────────

  private findBestMirror(
    simulations: SimulationResult[],
    actual: SimulationResult
  ): SimulationResult | null {
    if (simulations.length === 0) return null;

    return simulations.reduce((best, curr) => {
      const bestDiff = Math.abs(best.revenue - actual.revenue) +
                       Math.abs(best.riskScore - actual.riskScore);
      const currDiff = Math.abs(curr.revenue - actual.revenue) +
                       Math.abs(curr.riskScore - actual.riskScore);
      return currDiff < bestDiff ? curr : best;
    });
  }

  // ─── Private: Update Mirror Accuracies ─────────────────────────────────────

  private async updateMirrorAccuracies(
    simulations: SimulationResult[],
    actual: SimulationResult
  ): Promise<number> {
    let totalAccuracy = 0;

    for (const sim of simulations) {
      // حساب الدقة: كلما قلّ الفرق، زادت الدقة
      const revenueDiff = actual.revenue > 0
        ? 1 - Math.min(Math.abs(sim.revenue - actual.revenue) / actual.revenue, 1)
        : sim.revenue === 0 ? 1 : 0;

      const riskDiff = 1 - Math.abs(sim.riskScore - actual.riskScore) / 100;
      const outcomeMatch = sim.outcome === actual.outcome ? 1 : 0;

      const accuracy = (revenueDiff * 0.4) + (riskDiff * 0.3) + (outcomeMatch * 0.3);
      totalAccuracy += accuracy;

      // تحديث أداء المرآة في WorkforceTree
      await workforceTree.updateMirrorPerformance(
        sim.mirrorId,
        accuracy,
        actual.outcome === 'success'
      );
    }

    return simulations.length > 0 ? totalAccuracy / simulations.length : 0;
  }

  // ─── Private: Spawn Mutation ────────────────────────────────────────────────

  private async spawnMutation(
    parentAgentId: string,
    failureContext: SimulationResult
  ): Promise<boolean> {
    try {
      const mutationPrompt = `
Based on this execution failure, generate a NEW agent persona that would have avoided it.

FAILURE CONTEXT:
- Outcome: ${failureContext.outcome}
- Risk Score: ${failureContext.riskScore}/100
- Revenue: $${failureContext.revenue}
- Path taken: ${failureContext.path.join(' → ')}
- Reasoning: ${failureContext.reasoning}

Generate a mutation agent that specifically avoids this failure pattern.
Return ONLY valid JSON:
{
  "title": "Mutation Agent Title",
  "capabilities": ["capability1", "capability2"],
  "cautionRules": ["avoid X", "always check Y"],
  "personaVariant": "conservative" | "aggressive" | "chaos",
  "justification": "Why this mutation would have succeeded"
}
      `.trim();

      const raw = await callOllama(mutationPrompt, [
        { role: 'system', content: 'You are a mutation engine. Return ONLY valid JSON.' },
        { role: 'user', content: mutationPrompt },
      ]);

      const mutation = JSONHardener.extract<any>(raw);

      // توظيف الطفرة كمرآة جديدة
      await workforceTree.hireMirror(parentAgentId, {
        personaVariant: mutation.personaVariant || 'conservative',
        simulationDepth: 180,
        model: 'qwen2.5:3b',
        temperature: 0.7, // أقل عشوائية للطفرات
      });

      // حفظ في الذاكرة
      await tieredMemory.add(
        `[Mutation] Spawned new mirror for ${parentAgentId}: ${mutation.title}. Caution rules: ${mutation.cautionRules?.join(', ')}`,
        'venture_failure'
      );

      console.log(`[FeedbackForge] 🧬 Mutation spawned: ${mutation.title}`);
      return true;
    } catch (e) {
      console.error('[FeedbackForge] Mutation spawn failed:', e);
      return false;
    }
  }

  // ─── Private: Check Promotion Candidates ───────────────────────────────────

  private checkPromotionCandidates(parentAgentId: string): PromotionRequest[] {
    const candidates = workforceTree.getPromotionCandidates(0.7);

    return candidates
      .filter(node => node.mirrorMeta?.parentRealAgentId === parentAgentId)
      .map(node => {
        const meta = node.mirrorMeta!;
        const avgAccuracy = meta.accuracyHistory.reduce((a, b) => a + b, 0) / (meta.accuracyHistory.length || 1);
        
        return {
          mirrorId: node.id,
          promotionScore: meta.promotionScore,
          accuracyHistory: meta.accuracyHistory,
          simulationsCompleted: meta.totalSimulations,
          recommendedRole: `specialist-${meta.personaVariant}`,
          recommendedTitle: `${meta.personaVariant.charAt(0).toUpperCase() + meta.personaVariant.slice(1)} Specialist`,
          justification: `Mirror achieved ${Math.round(avgAccuracy * 100)}% accuracy over ${meta.totalSimulations} simulations.`,
        };
      });
  }

  // ─── Private: Archive to Memory ────────────────────────────────────────────

  private async archiveToMemory(
    parentAgentId: string,
    simulations: SimulationResult[],
    actual: SimulationResult,
    accuracy: number
  ): Promise<void> {
    const summary = `
[FeedbackForge Archive]
Agent: ${parentAgentId}
Actual Outcome: ${actual.outcome} | Revenue: $${actual.revenue} | Risk: ${actual.riskScore}
Simulation Accuracy: ${Math.round(accuracy * 100)}%
Mirrors Used: ${simulations.length}
Best Prediction: ${simulations[0]?.reasoning?.slice(0, 100) || 'N/A'}
    `.trim();

    await tieredMemory.add(summary, actual.outcome === 'failure' ? 'venture_failure' : 'observation');
  }
}

export const feedbackForge = FeedbackForge.getInstance();
