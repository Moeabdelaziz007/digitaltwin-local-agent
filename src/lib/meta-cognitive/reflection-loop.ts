import { skillRegistry } from '../agents/profit-lab/skill-registry';
import { callOllama } from '../ollama-client';
import { attributionEngine } from '../causal/attribution';

/**
 * /src/lib/meta-cognitive/reflection-loop.ts
 * The "Self-Improvement Engine": Thinking about Thinking.
 */

export interface TaskOutcome {
  taskId: string;
  success: boolean;
  steps: string[];
  duration: number;
}

export interface MetaCognitiveState {
  recentTaskOutcomes: TaskOutcome[];
  weakSkills: string[];
  strongSkills: string[];
  hypotheses: string[]; // "I think I fail at X because Y"
  experiments: string[]; // "Let me try Z approach next time"
}

export class ReflectionLoop {
  private static instance: ReflectionLoop;
  private state: MetaCognitiveState = {
    recentTaskOutcomes: [],
    weakSkills: [],
    strongSkills: [],
    hypotheses: [],
    experiments: []
  };

  private constructor() {}

  public static getInstance(): ReflectionLoop {
    if (!ReflectionLoop.instance) {
      ReflectionLoop.instance = new ReflectionLoop();
    }
    return ReflectionLoop.instance;
  }

  /**
   * Post-Task Reflection: The "Meta-Cognitive OODA Loop"
   */
  public async reflect(taskDescription: string, outcome: TaskOutcome) {
    console.log(`[MetaCognitive] Reflecting on task: ${taskDescription}`);
    
    this.state.recentTaskOutcomes.push(outcome);
    if (this.state.recentTaskOutcomes.length > 50) this.state.recentTaskOutcomes.shift();

    // 1. Analyze via LLM (The "Internal Critic")
    const analysisRaw = await callOllama(`
      Task: ${taskDescription}
      Result: ${outcome.success ? 'SUCCESS' : 'FAILURE'}
      Steps Taken: ${outcome.steps.join(' -> ')}
      
      What should we do differently next time? Identify the specific skill involved.
      Return JSON: { "lesson": "...", "skillToImprove": "...", "newApproach": "...", "confidence": 0-1 }
    `, [
      { role: 'system', content: 'You are the Meta-Cognitive Architect of a self-improving AI system.' }
    ]);

    try {
      const analysis = JSON.parse(analysisRaw);
      
      // 2. Reinforce/Evolve the Skill
      await skillRegistry.evaluateSkill(
        analysis.skillToImprove, 
        outcome.success ? 'success' : 'fail'
      );

      // 3. Update Hypotheses
      if (!outcome.success) {
        this.state.hypotheses.push(`FAILURE_ANALYSIS: ${analysis.lesson}`);
        this.state.experiments.push(`NEXT_TRY: ${analysis.newApproach}`);
      }

      // 4. Record Causal Attribution
      await attributionEngine.recordTrace({
        event: taskDescription,
        outcome: outcome.success ? 'success' : 'failure',
        causes: [
          { factor: analysis.skillToImprove, impact: outcome.success ? 'positive' : 'negative', weight: analysis.confidence || 0.8 }
        ],
        counterfactual: `If I had used ${analysis.newApproach} instead of ${analysis.skillToImprove}, the outcome would likely have been ${outcome.success ? 'even better' : 'successful'}.`,
        confidence: analysis.confidence || 0.8
      });

      console.log(`[MetaCognitive] Lesson Learned: ${analysis.lesson}`);

      // 4. [FUTURE] SELF-SCAFFOLDING:
      // If confidence > 0.9 and skill is missing, trigger a 'SkillGenerator' agent 
      // to write a new .ts file in src/lib/agents/profit-lab/skills/
      
    } catch (e) {
      console.warn('[MetaCognitive] Reflection parsing failed. Storing raw observation.');
    }
  }

  public getState(): MetaCognitiveState {
    return this.state;
  }
}

export const metaCognitive = ReflectionLoop.getInstance();
