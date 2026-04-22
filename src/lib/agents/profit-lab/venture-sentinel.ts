import { SkillGapTrainer, TrainingPlan } from './skill-gap-trainer';
import { RevenueStressTest, StressTestResult } from './revenue-stress-test';

/**
 * [STAGE-0 SIMULATION STUB]
 * VentureSentinelAgent: A mathematical gatekeeper for the venture lab.
 * This agent performs deterministic validation. It is NOT an automated financial execution engine.
 */
export class VentureSentinelAgent {
  private name = 'The Synapse (Sentinel)';
  private version = '1.2.5 [STUB]';
  private trainer = new SkillGapTrainer();
  private stressTester = new RevenueStressTest();

  /**
   * Evaluates stage transition based on DETERMINISTIC METRICS.
   * Logic: Math First, LLM Second (Analysis only).
   */
  public async evaluateStageTransition(
    opportunity: Opportunity,
    currentStage: VentureStage,
    agentOutputs: AgentOutput[]
  ): Promise<VentureSentinelResult & { training_plan?: TrainingPlan[], stress_test?: StressTestResult }> {
    const start = Date.now();
    
    // 1. DETERMINISTIC METRICS (Hard Truths)
    const readinessScore = this.calculateReadinessScore(opportunity, agentOutputs);
    const alignmentScore = await this.calculatePersonaAlignment(opportunity);
    const missingSkills = this.detectMissingSkills(currentStage, agentOutputs);
    
    let stressTest: StressTestResult | undefined;
    if (currentStage === 'Attack' || currentStage === 'Build') {
      stressTest = await this.stressTester.runScenarios(opportunity);
    }

    // 2. DECISION LOGIC (Deterministic Gates - No LLM involved in Pass/Fail)
    let verdict: 'PASS' | 'CONCERNS' | 'FAIL' = 'PASS';
    let rollbackTarget: VentureStage | undefined;
    let rollbackReason: string | undefined;

    if (readinessScore < 40 || alignmentScore < 30) {
      verdict = 'FAIL';
      rollbackTarget = 'Explore';
      rollbackReason = `METRIC_FAILURE: Readiness (${readinessScore}%) or Alignment (${alignmentScore}%) below critical threshold.`;
    } else if (missingSkills.length > 2 || (stressTest && !stressTest.base.survivability)) {
      verdict = 'CONCERNS';
      rollbackTarget = this.getPreviousStage(currentStage);
      rollbackReason = stressTest && !stressTest.base.survivability 
        ? "FINANCIAL_FRAGILITY: Failed deterministic stress test." 
        : "SKILL_GAP: Critical neural deficit detected.";
    }

    // 3. LLM AS EXPLAINER (Synthesizing the "Why" based on the "What")
    const explanationContext = {
      verdict,
      metrics: { readinessScore, alignmentScore, missing_count: missingSkills.length },
      stress_test_status: stressTest ? (stressTest.base.survivability ? 'STABLE' : 'FRAGILE') : 'N/A'
    };

    const nextStage = verdict === 'PASS' ? this.getNextStage(currentStage) : undefined;

    // 4. GENERATE REASONING SUMMARY (Narrative Layer)
    let reasoningSummary = "";
    try {
      const reasoningPrompt = `
        Summarize the sentinel's verdict for the user:
        STRICT_METRICS: ${JSON.stringify(explanationContext)}
        
        Draft a 1-sentence technical justification for the ${verdict} decision.
      `;
      reasoningSummary = await callOllama(reasoningPrompt);
    } catch {
      reasoningSummary = rollbackReason || "Transition criteria met.";
    }

    // Generate Training Plan if missing skills
    let trainingPlan: TrainingPlan[] | undefined;
    if (missingSkills.length > 0) {
      trainingPlan = await this.trainer.generateTrainingPlan(missingSkills);
    }

    return {
      verdict,
      current_stage: currentStage,
      next_stage: nextStage,
      blockers: this.identifyBlockers(opportunity, agentOutputs),
      rollback_target: rollbackTarget,
      rollback_reason: reasoningSummary,
      required_skills_missing: missingSkills,
      revenue_readiness_score: readinessScore,
      training_plan: trainingPlan,
      stress_test: stressTest,
      metadata: {
        evaluated_at: new Date().toISOString(),
        agent_version: this.version,
        alignment_score: alignmentScore,
        latency_ms: Date.now() - start
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
