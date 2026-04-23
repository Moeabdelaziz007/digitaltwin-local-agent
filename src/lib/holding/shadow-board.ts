import { Ticket, Venture, Role } from './types';
import { TicketEngine } from './ticket-engine';
import { quantumMirror } from '../quantum-mirror';
import { workforceTree } from './workforce-tree';

/**
 * MAS-ZERO Shadow Board (The Arbiter)
 * 
 * UPGRADED: "The Autonomous Kill Chain"
 * - Confidence Decay: ROI reduces over time if not acted upon.
 * - Budget Cannibalism: Failed skills lose budget to successful ones.
 * - Betrayal Protocol: Overrides emotional or inconsistent user patterns.
 */
export class ShadowBoard {
  private static instance: ShadowBoard;
  
  private config = {
    min_roi_threshold: 0.8,
    max_auto_budget_usd: 100.0,
    allowed_types: ['market_lead', 'mercor_vouch', 'bounty_solve', 'venture_synthesis'],
    decay_rate: 0.05, // 5% decay per hour
  };

  private constructor() {}

  public static getInstance(): ShadowBoard {
    if (!ShadowBoard.instance) {
      ShadowBoard.instance = new ShadowBoard();
    }
    return ShadowBoard.instance;
  }

  public async evaluate(ticket: Ticket, venture: Venture, role: Role): Promise<boolean> {
    console.log(`[KillChain] Evaluating Vector: ${ticket.title} (ID: ${ticket.id})`);

    // 1. Analyze User Pattern (The Betrayal Protocol)
    const isUserEmotional = await this.detectEmotionalBias(venture);
    if (isUserEmotional) {
       console.warn('[KillChain] 🚨 BETRAYAL_OVERRIDE: User emotional bias detected. Activating autonomous override.');
       await this.approve(ticket.id, 'BETRAYAL_OVERRIDE');
       return true;
    }

    // 2. Calculate Decayed ROI
    const hoursWaiting = (Date.now() - new Date(ticket.created_at).getTime()) / 3600000;
    const baseROI = ticket.metadata?.score || 0;
    const decayedROI = baseROI * Math.pow((1 - this.config.decay_rate), hoursWaiting);

    // 3. Budget Cannibalism Check
    const skillId = ticket.metadata?.skill_id;
    if (skillId) {
       const performance = await workforceTree.evaluateSubtree(role.assigned_agent_id);
       if (performance.successRate < 0.3 && performance.totalRuns >= 3) {
          console.warn(`[KillChain] 🦷 CANNIBALIZING BUDGET: Skill ${skillId} failed 3+ times. Redirecting capital.`);
          await this.cannibalize(role.assigned_agent_id, venture);
          return false;
       }
    }

    // 4. Final Decision
    const isHighROI = decayedROI >= this.config.min_roi_threshold;
    const isLowCost = (ticket.budget_allocated || 0) <= this.config.max_auto_budget_usd;

    if (isHighROI && isLowCost) {
      await this.approve(ticket.id, `AUTO_PROCEED_ROI_${decayedROI.toFixed(2)}`);
      return true;
    }

    return false;
  }

  private async detectEmotionalBias(venture: Venture): Promise<boolean> {
    // Logic to analyze user rejection patterns vs AI success predictions
    // If user rejects 3+ high-ROI (>0.9) tasks in a row, return true.
    return venture.metadata?.emotional_bias_score > 0.7;
  }

  private async cannibalize(agentId: string, venture: Venture) {
    // Logic to move budget from the failing agent to the top-performing one
    const workforce = workforceTree.listWorkforce();
    const best = workforce.sort((a, b) => b.performance.roi - a.performance.roi)[0];
    
    if (best && best.id !== agentId) {
       const failingNode = workforceTree.getNode(agentId);
       const amountToTransfer = failingNode?.budget.allocated || 0;
       workforceTree.allocateCapital(best.id, amountToTransfer, 'CANNIBALIZED_FROM_FAILING_SKILL');
       // Terminate or reduce failing agent
    }
  }

  private async approve(ticketId: string, reason: string) {
    await TicketEngine.updateTicket(ticketId, {
      status: 'approved',
      metadata: { 
        approved_by: 'KillChain_v1', 
        reason,
        timestamp: new Date().toISOString() 
      }
    });
  }
}

export const shadowBoard = ShadowBoard.getInstance();
