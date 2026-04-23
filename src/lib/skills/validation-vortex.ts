import { ISkill, SkillMetadata, ExecutionResult } from './types';
import { Venture, Role, Ticket } from '../holding/types';
import { callOllama } from '../ollama-client';
import { TicketEngine } from '../holding/ticket-engine';
import { ventureRegistry } from '../holding/venture-registry';

/**
 * ValidationVortexSkill (The Auto-Landing Factory)
 * 
 * "The Bad Idea Killer": A 5-day automated validation funnel.
 * Day 1: Landing Page + Waitlist
 * Day 2: Kill Switch (< 50 emails)
 * Day 3: Price Generation (> 50)
 * Day 4: MVP Build (> 200)
 * Day 5: PH Launch (> 10 pre-orders)
 */
export class ValidationVortexSkill extends ISkill {
  id = 'validation-vortex';
  metadata: SkillMetadata = {
    id: 'validation-vortex',
    name: 'The Validation Vortex',
    version: '1.0.0',
    description: 'Automated market validation machine that kills bad ideas in 48 hours.',
    category: 'revenue',
    revenue_impact: 'high',
    permissions: ['filesystem', 'network', 'analytics_read', 'deployment'],
    required_tools: ['Next.js', 'PocketBase', 'ProductHunt API'],
    when_to_use: 'When you have a new niche idea and want to test viability without building.'
  };

  async scan(): Promise<any[]> {
    // Scan for new projects in 'ideation' stage that haven't entered the vortex
    const ventures = ventureRegistry.listVentures();
    return ventures.filter(v => v.metadata?.vortex_status === undefined || v.metadata?.vortex_status === 'active');
  }

  async score(items: any[], venture: Venture): Promise<any[]> {
    // Score based on email growth velocity
    return items.map(v => {
      const day = this.getVortexDay(v);
      const emails = v.metadata?.waitlist_count || 0;
      let score = 0;

      if (day === 2 && emails < 50) score = -1; // Death Sentence
      else if (day === 4 && emails > 200) score = 1; // High Potential
      else score = emails / 200;

      return { ...v, vortex_day: day, score };
    });
  }

  async generate(bestOpportunity: any): Promise<any> {
    const day = bestOpportunity.vortex_day;
    const emails = bestOpportunity.metadata?.waitlist_count || 0;

    if (day === 1) {
      return { action: 'GENERATE_LANDING', prompt: `Create a conversion-optimized landing page for ${bestOpportunity.name}. Niche: ${bestOpportunity.vision}. Focus on pain point and waitlist.` };
    }
    if (day === 2 && emails < 50) {
      return { action: 'KILL_PROJECT', reason: `Only ${emails} emails in 48 hours. Target was 50. Project terminated to save resources.` };
    }
    if (day === 3 && emails >= 50) {
      return { action: 'GENERATE_PRICING', prompt: `Analyze ${emails} signups for ${bestOpportunity.name}. Suggest 3 pricing tiers: Free, Pro, Enterprise.` };
    }
    
    return { action: 'WAIT', status: 'In progress' };
  }

  async execute(venture: Venture, role: Role, ticket?: Ticket): Promise<ExecutionResult> {
    const day = this.getVortexDay(venture);
    const emails = venture.metadata?.waitlist_count || 0;

    console.log(`[Vortex] Venture ${venture.name} is on Day ${day} with ${emails} leads.`);

    // Day 2 Kill Switch Logic
    if (day >= 2 && emails < 50 && venture.status !== 'archived') {
       console.error(`[Vortex] 💀 KILL SWITCH ACTIVATED: ${venture.name} failed validation.`);
       ventureRegistry.updateVenture(venture.id, { status: 'archived', metadata: { ...venture.metadata, vortex_status: 'killed' } });
       return { success: true, output: `Project ${venture.name} has been terminated due to low market interest.` };
    }

    // Day 1 Execution (First Time)
    if (day === 1 && !venture.metadata?.vortex_initialized) {
       const plan = await this.generate(venture);
       // In a real system, this would call a component-generator tool
       ventureRegistry.updateVenture(venture.id, { metadata: { ...venture.metadata, vortex_initialized: true, vortex_start_date: new Date().toISOString() } });
       return { success: true, output: `Vortex initialized for ${venture.name}. Landing page generation queued.` };
    }

    return { success: true, output: `Vortex cycling for ${venture.name}. Status: Stable.` };
  }

  async verify(result: ExecutionResult): Promise<boolean> {
    return result.success;
  }

  async learn(outcome: ExecutionResult, venture: Venture): Promise<void> {
    // Record failure/success patterns to refine Day 2 thresholds
  }

  private getVortexDay(venture: Venture): number {
    if (!venture.metadata?.vortex_start_date) return 1;
    const start = new Date(venture.metadata.vortex_start_date).getTime();
    const now = Date.now();
    return Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
  }
}

// Self-Register
import { skillRegistry } from './registry';
skillRegistry.registerSkillInstance(new ValidationVortexSkill());
