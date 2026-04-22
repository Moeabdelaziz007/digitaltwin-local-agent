import { VentureStage, VentureSentinelResult, Opportunity } from '@/types/twin';

export class VentureSentinelAgent {
  private name = 'The Synapse (Sentinel)';
  private version = '1.1.0';

  /**
   * Evaluates the readiness of a venture to move to the next stage.
   * Implements Recursive Refinement (Rollback) logic.
   */
  public async evaluateStageTransition(
    opportunity: Opportunity,
    currentStage: VentureStage,
    agentOutputs: any[]
  ): Promise<VentureSentinelResult> {
    console.log(`[${this.name}] Evaluating transition from ${currentStage}...`);

    // Logic for calculating Revenue Readiness Score & Persona Alignment
    const readinessScore = this.calculateReadinessScore(opportunity, agentOutputs);
    const alignmentScore = this.calculatePersonaAlignment(opportunity);
    const missingSkills = this.detectMissingSkills(currentStage, agentOutputs);
    const blockers = this.identifyBlockers(opportunity, agentOutputs);

    let verdict: 'PASS' | 'CONCERNS' | 'FAIL' = 'PASS';
    let rollbackTarget: VentureStage | undefined;
    let rollbackReason: string | undefined;
    let nextStage: VentureStage | undefined;

    // Threshold Logic for Recursive Refinement (Neural Integration)
    if (readinessScore < 40 || alignmentScore < 30) {
      verdict = 'FAIL';
      rollbackTarget = 'Explore';
      rollbackReason = readinessScore < 40 
        ? `[The Synapse] Revenue Readiness (${readinessScore}) is critically low. Refracting via The Prism required.`
        : `[The Synapse] Persona Alignment (${alignmentScore}) is too low. Venture fails User identity sync.`;
    } else if (missingSkills.length > 2 || blockers.length > 0) {
      verdict = 'CONCERNS';
      rollbackTarget = this.getPreviousStage(currentStage);
      rollbackReason = `[The Synapse] Neural gaps detected. Missing skills or blockers in the Kinetic path.`;
    } else {
      nextStage = this.getNextStage(currentStage);
    }

    return {
      verdict,
      current_stage: currentStage,
      next_stage: nextStage,
      blockers,
      rollback_target: rollbackTarget,
      rollback_reason: rollbackReason,
      required_skills_missing: missingSkills,
      revenue_readiness_score: readinessScore,
      metadata: {
        evaluated_at: new Date().toISOString(),
        agent_version: this.version
      }
    };
  }

  private calculateReadinessScore(opportunity: Opportunity, outputs: any[]): number {
    // Initial heuristic: combine confidence, sentiment, and output depth
    const baseScore = (opportunity.score || 50);
    const confidenceBoost = (opportunity.confidence || 0.5) * 20;
    const sentimentBoost = (opportunity.sentiment_score || 0.5) * 10;
    
    return Math.min(100, Math.max(0, baseScore + confidenceBoost + sentimentBoost - (outputs.length < 3 ? 15 : 0)));
  }

  private calculatePersonaAlignment(opportunity: Opportunity): number {
    // Expert Level Logic: In a real run, this would compare venture category
    // with User's 'Companion' interests/skills stored in memory.
    // For now, we simulate this alignment.
    return 85; // Mocking high alignment for the demo
  }

  private detectMissingSkills(stage: VentureStage, outputs: any[]): string[] {
    // Placeholder for actual skill gap detection logic
    return [];
  }

  private identifyBlockers(opportunity: Opportunity, outputs: any[]): string[] {
    const blockers: string[] = [];
    if (opportunity.status === 'rejected') blockers.push('Opportunity is marked as rejected');
    return blockers;
  }

  private getNextStage(current: VentureStage): VentureStage {
    const stages: VentureStage[] = ['Explore', 'Collapse', 'Attack', 'Build', 'Synthesis'];
    const idx = stages.indexOf(current);
    return stages[Math.min(stages.length - 1, idx + 1)];
  }

  private getPreviousStage(current: VentureStage): VentureStage {
    const stages: VentureStage[] = ['Explore', 'Collapse', 'Attack', 'Build', 'Synthesis'];
    const idx = stages.indexOf(current);
    return stages[Math.max(0, idx - 1)];
  }
}
