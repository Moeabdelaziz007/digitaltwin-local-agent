import { ISkill, ExecutionResult } from './types';
import { Venture, Role, Ticket } from '../holding/types';

/**
 * SkillOrchestrator
 * Central manager for the MAS-ZERO skill lifecycle.
 */
export class SkillOrchestrator {
  /**
   * Executes a skill through its full lifecycle: scan -> score -> generate -> execute -> verify -> learn.
   */
  public static async run(skill: ISkill, venture: Venture, role: Role, ticket?: Ticket): Promise<ExecutionResult> {
    const skillName = skill.metadata.name || skill.id;
    console.log(`[Orchestrator] 🚀 Starting lifecycle for skill: ${skillName}`);
    
    try {
      // 1. Discovery (Optional)
      console.log(`[Orchestrator] [1/6] Scanning for opportunities...`);
      const items = await skill.scan();
      
      // 2. Evaluation (Optional)
      console.log(`[Orchestrator] [2/6] Scoring ${items.length} items...`);
      const scored = await skill.score(items, venture);
      
      // 3. Synthesis (Optional)
      console.log(`[Orchestrator] [3/6] Generating execution plan...`);
      const plan = await skill.generate(scored[0] || {});
      
      // 4. Execution (Required)
      console.log(`[Orchestrator] [4/6] Executing core logic...`);
      const result = await skill.execute(venture, role, ticket);
      
      // 5. Verification
      console.log(`[Orchestrator] [5/6] Verifying results...`);
      const isValid = await skill.verify(result);
      
      // 6. Evolution
      console.log(`[Orchestrator] [6/6] Learning from outcome...`);
      await skill.learn(result, venture);
      
      console.log(`[Orchestrator] ✅ Skill lifecycle completed: ${skillName} (${result.success ? 'SUCCESS' : 'FAILURE'})`);
      
      return {
        ...result,
        verified: isValid
      };
    } catch (error) {
      console.error(`[Orchestrator] ❌ Lifecycle failed for ${skillName}:`, error);
      return {
        success: false,
        output: `Orchestration Error: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.stack : undefined
      };
    }
  }
}
