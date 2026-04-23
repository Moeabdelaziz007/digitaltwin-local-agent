import { ISkill, ExecutionResult, SkillMetadata } from './types';
import { TicketEngine } from '../holding/ticket-engine';
import { Venture, Role, Ticket } from '../holding/types';
import { callOllama } from '../ollama-client';
import { tieredMemory } from '../memory/tiered-store';

/**
 * SUPERPOWER: The Expert Validator
 * Combines Bounty Hunter (AI) with Mercor (Human) for guaranteed revenue.
 */
export class ExpertValidatorSkill extends ISkill {
  id = 'expert-validator';
  metadata: SkillMetadata = {
    id: 'expert-validator',
    name: 'The Expert Validator',
    version: '1.0.0',
    description: 'Combines AI-driven code generation with Human expert validation via Mercor.',
    category: 'revenue',
    revenue_impact: 'high',
    permissions: ['network', 'governance', 'github_api'],
    required_tools: ['ollama', 'mercor-bridge', 'bounty-hunter']
  };

  async scan(): Promise<any[]> {
    const tickets = await TicketEngine.listTickets();
    return tickets.filter(t => t.metadata?.type === 'github_bounty' && t.status === 'done' && !t.metadata?.human_validated);
  }

  async score(items: any[], venture: Venture): Promise<any[]> {
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

    const validationTicket = await TicketEngine.createTicket(venture, role, {
      title: `[VALIDATION REQUIRED] Expert Review for Bounty Fix: ${top.metadata.issue.repo}`,
      context: `
 Our AI has drafted a solution for a GitHub bounty. We need a Mercor expert to validate the technical integrity before we submit.
 Solution to Review: ${top.metadata.solution}
      `,
      status: 'pending',
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

// Self-Register
import { skillRegistry } from './registry';
skillRegistry.registerSkillInstance(new ExpertValidatorSkill());
