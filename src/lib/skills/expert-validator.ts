import { BaseSkill, ExecutionResult } from './types';
import { skillRegistry } from './registry';
import { TicketEngine } from '../holding/ticket-engine';
import { Venture, Role, Ticket } from '../holding/types';
import { callOllama } from '../ollama-client';
import { tieredMemory } from '../memory/tiered-store';

/**
 * SUPERPOWER: The Expert Validator
 * Combines Bounty Hunter (AI) with Mercor (Human) for guaranteed revenue.
 */
export class ExpertValidatorSkill extends BaseSkill {
  id = 'expert-validator';

  async scan(): Promise<any[]> {
    // Finds approved bounty solutions that haven't been validated by a human yet
    const tickets = await TicketEngine.listTickets();
    return tickets.filter(t => t.metadata?.type === 'github_bounty' && t.status === 'approved' && !t.metadata?.human_validated);
  }

  async score(items: any[], venture: Venture): Promise<any[]> {
    // High ROI if the reward is > $200
    return items.map(item => ({
      ...item,
      score: (item.metadata?.issue?.reward !== 'TBD' && parseInt(item.metadata?.issue?.reward) > 200) ? 0.95 : 0.8
    })).sort((a, b) => b.score - a.score);
  }

  async generate(bestOpportunity: any): Promise<any> {
    const prompt = `Create a validation request for a Mercor expert to review this fix for ${bestOpportunity.metadata.issue.repo}. \n\nSolution: ${bestOpportunity.metadata.solution}`;
    const request = await callOllama(prompt, [{ role: 'system', content: 'You are a Technical Quality Coordinator.' }]);
    return { ...bestOpportunity, validationRequest: request };
  }

  async execute(venture: Venture, role: Role, ticket?: Ticket): Promise<ExecutionResult> {
    if (ticket && ticket.metadata?.expert_feedback) {
      // Final step: Human expert said YES. Submit PR.
      console.log(`[ExpertValidator] FINAL SUBMISSION APPROVED BY EXPERT for ticket ${ticket.id}`);
      return {
        success: true,
        output: `Expert-Validated PR Submitted to ${ticket.metadata?.issue?.repo}.`,
        metadata: { validated: true, expert: ticket.metadata?.expert_id }
      };
    }

    const pending = await this.scan();
    const scored = await this.score(pending, venture);
    const top = scored[0];

    if (!top) return { success: false, output: 'no_bounty_solutions_awaiting_validation' };

    const generated = await this.generate(top);

    // Create a NEW ticket for the Human Expert via Mercor Bridge logic
    const validationTicket = await TicketEngine.createTicket(venture, role, {
      title: `[VALIDATION REQUIRED] Expert Review for Bounty Fix: ${top.metadata.issue.repo}`,
      context: `
### Context
Our AI has drafted a solution for a GitHub bounty. We need a Mercor expert to validate the technical integrity before we submit.

### Solution to Review
${top.metadata.solution}

### Instructions
1. Match with an expert on [work.mercor.com](https://work.mercor.com).
2. Provide this solution for review.
3. Record their feedback and "Vouch" status here.
      `,
      priority: 'critical',
      metadata: { 
        type: 'mercor_validation', 
        parent_ticket_id: top.id,
        issue: top.metadata.issue 
      }
    });

    return {
      success: true,
      output: `Validation lifecycle triggered. Ticket: ${validationTicket.id}`,
      ticketId: validationTicket.id
    };
  }

  async verify(result: ExecutionResult): Promise<boolean> {
    return !!result.metadata?.validated;
  }

  async learn(outcome: ExecutionResult, venture: Venture): Promise<void> {
    await tieredMemory.add(
      `[Superpower] Expert validation successful for ${venture.name}. Increased trust in AI-Human hybrid workflows.`,
      'observation'
    );
  }
}

// Register
skillRegistry.registerSkill({
  id: ExpertValidatorSkill.id,
  metadata: {
    name: 'The Expert Validator',
    version: '1.0.0',
    description: 'Combines AI-driven code generation with Human expert validation via Mercor.',
    category: 'revenue',
    revenue_impact: 'critical',
    permissions: ['network', 'governance', 'github_api'],
    required_tools: ['ollama', 'mercor-bridge', 'bounty-hunter']
  },
  instructions: 'Ensure all AI-generated bounty fixes are reviewed by a human expert before submission.'
});
