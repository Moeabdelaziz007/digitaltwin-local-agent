import { SkillGapTrainer, TrainingPlan } from './skill-gap-trainer';
import { RevenueStressTest, StressTestResult } from './revenue-stress-test';

export class VentureSentinelAgent {
  private name = 'The Synapse (Sentinel)';
  private version = '1.2.0';
  private memoryEngine = memoryEngine;
  private trainer = new SkillGapTrainer();
  private stressTester = new RevenueStressTest();

  /**
   * Evaluates the readiness of a venture to move to the next stage.
   */
  public async evaluateStageTransition(
    opportunity: Opportunity,
    currentStage: VentureStage,
    agentOutputs: AgentOutput[]
  ): Promise<VentureSentinelResult & { training_plan?: TrainingPlan[], stress_test?: StressTestResult }> {
    console.log(`[${this.name}] Evaluating transition from ${currentStage}...`);

    const readinessScore = this.calculateReadinessScore(opportunity, agentOutputs);
    const alignmentScore = await this.calculatePersonaAlignment(opportunity);
    const missingSkills = this.detectMissingSkills(currentStage, agentOutputs);
    const blockers = this.identifyBlockers(opportunity, agentOutputs);

    // Run Stress Test if moving to Synthesis or Attack
    let stressTest: StressTestResult | undefined;
    if (currentStage === 'Attack' || currentStage === 'Build') {
      stressTest = await this.stressTester.runScenarios(opportunity);
    }

    // Generate Training Plan if missing skills
    let trainingPlan: TrainingPlan[] | undefined;
    if (missingSkills.length > 0) {
      trainingPlan = await this.trainer.generateTrainingPlan(missingSkills);
    }

    let verdict: 'PASS' | 'CONCERNS' | 'FAIL' = 'PASS';
    let rollbackTarget: VentureStage | undefined;
    let rollbackReason: string | undefined;
    let nextStage: VentureStage | undefined;

    if (readinessScore < 40 || alignmentScore < 30) {
      verdict = 'FAIL';
      rollbackTarget = 'Explore';
      rollbackReason = readinessScore < 40 
        ? `[The Synapse] Revenue Readiness (${readinessScore}) is low. Refracting via The Prism required.`
        : `[The Synapse] Persona Alignment (${alignmentScore}) is too low. Venture fails User identity sync.`;
    } else if (missingSkills.length > 2 || (stressTest && !stressTest.base.survivability)) {
      verdict = 'CONCERNS';
      rollbackTarget = this.getPreviousStage(currentStage);
      rollbackReason = stressTest && !stressTest.base.survivability
        ? `[The Synapse] Financial Fragility detected. Opportunity failed stress tests.`
        : `[The Synapse] Neural gaps detected. Training Plan generated.`;
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
      training_plan: trainingPlan,
      stress_test: stressTest,
      metadata: {
        evaluated_at: new Date().toISOString(),
        agent_version: this.version,
        alignment_score: alignmentScore
      }
    };
  }

  private calculateReadinessScore(opportunity: Opportunity, outputs: AgentOutput[]): number {
    // Initial heuristic: combine confidence, sentiment, and output depth
    const baseScore = (opportunity.score || 50);
    const confidenceBoost = (opportunity.confidence || 0.5) * 20;
    const sentimentBoost = (opportunity.sentiment_score || 0.5) * 10;
    
    return Math.min(100, Math.max(0, baseScore + confidenceBoost + sentimentBoost - (outputs.length < 3 ? 15 : 0)));
  }

  private async calculatePersonaAlignment(opportunity: Opportunity): Promise<number> {
    const userMemory = await this.memoryEngine.getUserProfile(opportunity.user_id);
    const skills = userMemory?.skills || [];
    const interests = userMemory?.interests || [];
    
    const skillMatch = skills.filter(s => 
      opportunity.required_skills?.includes(s)
    ).length;
    
    const interestMatch = interests.filter(i => 
      opportunity.category?.toLowerCase().includes(i.toLowerCase())
    ).length;
    
    return Math.min(100, (skillMatch * 20) + (interestMatch * 15) + 30);
  }

  private detectMissingSkills(stage: VentureStage, outputs: AgentOutput[]): string[] {
    const requiredSkillsPerStage: Record<VentureStage, string[]> = {
      'Explore':   ['market-research', 'competitor-analysis'],
      'Collapse':  ['financial-modeling', 'risk-assessment'],
      'Attack':    ['gtm-strategy', 'pricing-model'],
      'Build':     ['mvp-development', 'technical-architecture'],
      'Synthesis': ['scaling-plan', 'investor-deck']
    };
    
    const required = requiredSkillsPerStage[stage] || [];
    const completed = outputs.map(o => o.agentName);
    return required.filter(skill => !completed.includes(skill));
  }

  private identifyBlockers(opportunity: Opportunity, outputs: AgentOutput[]): string[] {
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
