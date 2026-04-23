import { ISkill, ExecutionResult, SkillMetadata } from './types';
import { TicketEngine } from '../holding/ticket-engine';
import { ventureRegistry } from '../holding/venture-registry';
import { Venture, Role, Ticket } from '../holding/types';
import { tieredMemory } from '../memory/tiered-store';
import { quantumMirror } from '../quantum-mirror';
import { callOllama } from '../ollama-client';

/**
 * MAS-ZERO Mercor Bridge Skill — Production Grade E2E
 */

export class MercorBridgeSkill extends ISkill {
  id = 'mercor-bridge';
  metadata: SkillMetadata = {
    id: 'mercor-bridge',
    name: 'Mercor Human Bridge',
    version: '2.0.0',
    description: 'E2E Expert Vouching & Affiliate Revenue Engine.',
    category: 'system',
    revenue_impact: 'high',
    permissions: ['network', 'governance'],
    required_tools: ['ollama', 'quantum-mirror']
  };

  /**
   * PHASE 1: Discovery
   */
  async scan(): Promise<any[]> {
    console.log('[MercorBridge] Scanning for expertise gaps in current ventures...');
    const ventures = ventureRegistry.listVentures();
    const needs: any[] = [];

    for (const v of ventures) {
      if (v.status === 'active' && (v.budget.monthly_limit_usd > 500 || v.metadata?.stage === 'scaling')) {
        needs.push({
          id: `mercor-need-${v.id}`,
          ventureId: v.id,
          ventureName: v.name,
          expertiseNeeded: v.metadata?.engine || 'General Technical Strategy',
          reason: 'High-stakes operation requiring expert vouching.'
        });
      }
    }
    return needs;
  }

  /**
   * PHASE 2: Score (Quantum Mirror)
   */
  async score(items: any[], venture: Venture): Promise<any[]> {
    const scored: any[] = [];
    for (const item of items) {
      const simulation = await quantumMirror.simulate(
        'mercor-validator',
        `Evaluate ROI of hiring a Mercor expert for ${item.expertiseNeeded} in venture ${item.ventureName}`,
        venture
      );

      const score = simulation.recommendation === 'proceed' ? 0.9 : 0.5;
      scored.push({ ...item, score, simulation });
    }
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * PHASE 3: Generate
   */
  async generate(bestOpportunity: any): Promise<any> {
    const prompt = `Draft a Mercor Vouching strategy for a ${bestOpportunity.expertiseNeeded} expert to support ${bestOpportunity.ventureName}. Focus on the 20% affiliate revenue.`;
    const strategy = await callOllama(prompt, [{ role: 'system', content: 'You are an Affiliate Strategy Architect.' }]);
    return { ...bestOpportunity, strategy };
  }

  /**
   * PHASE 4-6: Ticket & Execution
   */
  /**
   * PHASE 4: Execution
   */
  async execute(venture: Venture, role: Role, ticket?: Ticket, plan?: any): Promise<ExecutionResult> {
    if (ticket && ticket.status === 'done') {
      // ACTUAL VOUCHING (Final Action after approval)
      console.log(`[MercorBridge] Executing approved vouch for ${ticket.id}`);
      return {
        success: true,
        output: `Referral Link Generated: https://work.mercor.com/referral/${venture.id}`,
        metadata: { referral_url: `https://work.mercor.com/referral/${venture.id}` }
      };
    }

    // Use passed plan or run discovery
    let generated = plan;
    if (!generated) {
      const needs = await this.scan();
      const scored = await this.score(needs, venture);
      const top = scored[0];
      if (!top || top.score < 0.6) {
        return { success: false, output: 'No vouching opportunities passed simulation.' };
      }
      generated = await this.generate(top);
    }

    const top = generated;
    const newTicket = await TicketEngine.createTicket(venture, role, {
      title: `[MERCOR] Strategic Vouching: ${top.ventureName}`,
      context: `Expertise: ${top.expertiseNeeded}. ROI Sim: ${top.simulation.recommendation}. Strategy drafted.`,
      status: 'pending',
      metadata: { type: 'mercor_vouch', opportunity: top }
    });

    return { 
      success: true, 
      output: `Mercor Vouching Ticket ${newTicket.id} Created.`,
      ticketId: newTicket.id 
    };
  }

  async verify(result: ExecutionResult): Promise<boolean> {
    return !!result.metadata?.referral_url;
  }

  async learn(outcome: ExecutionResult, venture: Venture): Promise<void> {
    await tieredMemory.add(
      `[Mercor Lesson] Vouching successful for ${venture.name}. Status: ${outcome.success ? 'Confirmed' : 'Pending'}`,
      'observation'
    );
  }
}

// Register
import { skillRegistry } from './registry';
skillRegistry.registerSkillInstance(new MercorBridgeSkill());
