import { callOllama } from '../ollama-client';
import { metaCognitive } from '../meta-cognitive/reflection-loop';

/**
 * src/lib/opportunity/auto-launch.ts
 * Micro-SaaS Idea Validator + Builder: Automatically launches high-ROI ideas.
 */

export interface OpportunityCard {
  id: string;
  problem_statement: string;
  target_user: string;
  ROI_score: number;
  data_confidence: number;
  implementation_effort: number;
  why_now: string;
}

const LAUNCH_THRESHOLD = { 
  ROI_score: 7, 
  data_confidence: 0.7, 
  effort: 3 
};

export class AutoLauncher {
  /**
   * Evaluates a venture card and launches it if it exceeds thresholds.
   */
  public static async autoLaunchIfWorthy(card: OpportunityCard) {
    const isWorthy = 
      card.ROI_score >= LAUNCH_THRESHOLD.ROI_score &&
      card.data_confidence >= LAUNCH_THRESHOLD.data_confidence &&
      card.implementation_effort <= LAUNCH_THRESHOLD.effort;
      
    if (!isWorthy) {
      console.log(`[AutoLauncher] Idea ${card.id} did not meet threshold for auto-launch.`);
      return { status: 'skipped', reason: 'below_threshold' };
    }

    console.log(`[AutoLauncher] 🚀 LAUNCHING WORTHY IDEA: ${card.problem_statement}`);

    try {
      // 1. Generate the Tool (Simulated CodeGen)
      const prompt = `
        Build a minimal Next.js API route that solves: ${card.problem_statement}
        Target user: ${card.target_user}
        Keep it under 100 lines. Use free APIs only.
        Format: Return only the code block.
      `;
      
      const toolCode = await callOllama(prompt, [
        { role: 'system', content: 'You are a Senior Full-Stack Engineer specializing in high-performance micro-services.' }
      ]);

      // 2. Simulate Gumroad/LemonSqueezy Product Creation
      console.log(`[AutoLauncher] Creating listing: "${card.problem_statement.slice(0, 50)}..." at $9`);
      const listingUrl = `https://gumroad.com/l/${card.id}`;

      // 3. Simulate Deployment to Vercel
      console.log(`[AutoLauncher] Deploying tool to Vercel...`);
      const deploymentUrl = `https://${card.id}.vercel.app`;

      // 4. Meta-Cognitive Tracking
      await metaCognitive.reflect(
        `Auto-launched product: ${card.problem_statement}`,
        {
          taskId: `launch_${card.id}`,
          success: true,
          steps: ['CodeGen', 'GumroadCreation', 'VercelDeployment'],
          duration: 5000
        }
      );

      return {
        status: 'launched',
        deploymentUrl,
        listingUrl,
        toolCode: toolCode.substring(0, 100) + '...'
      };
    } catch (error) {
      console.error('[AutoLauncher] Launch failed:', error);
      return { status: 'error', message: (error as Error).message };
    }
  }
}
