import { ISkill, ExecutionResult, SkillMetadata } from './types';
import { TicketEngine } from '../holding/ticket-engine';
import { Venture, Role, Ticket } from '../holding/types';
import { callOllama } from '../ollama-client';

/**
 * src/lib/skills/marketing-specialist.ts
 * Reusable Growth Marketing Skill for any Venture
 */

export class MarketingSpecialistSkill extends ISkill {
  id = 'marketing-specialist';
  metadata: SkillMetadata = {
    id: 'marketing-specialist',
    name: 'Growth Marketer',
    version: '1.0.0',
    description: 'Generates organic growth strategies and viral content for any venture.',
    category: 'marketing',
    revenue_impact: 'medium',
    permissions: ['network', 'social_api_access'],
    required_tools: ['ollama', 'jina-reader']
  };

  async scan(): Promise<any[]> {
    return [{ type: 'market_campaign', status: 'ready' }];
  }

  async score(items: any[], venture: Venture): Promise<any[]> {
    return items.map(item => ({ ...item, score: 0.85 }));
  }

  async generate(bestOpportunity: any): Promise<any> {
    return { task: 'market_growth' };
  }

  async execute(venture: Venture, role: Role, ticket?: Ticket): Promise<ExecutionResult> {
    if (ticket && ticket.status === 'done') {
      return { success: true, output: 'Marketing campaign deployed successfully.' };
    }

    const vName = venture.name;
    const vMission = venture.mission_statement || 'Growth and scale';
    console.log(`[Marketing Director] Orchestrating campaign for ${vName}...`);

    const simulationResults = await this.runMarketSimulation(vName, vMission);
    const strategy = await this.generateStrategy(vName, vMission, simulationResults);
    const socialPosts = await this.draftContent(vName, strategy);

    const newTicket = await TicketEngine.createTicket(venture, role, {
      title: `[Growth] Orchestrated Campaign: ${vName}`,
      context: `
### Simulation Insights
${simulationResults}

### Strategy
${strategy}

### Assets
${socialPosts}
      `,
      status: 'pending',
      metadata: {
        type: 'marketing_orchestration',
        simulation_data: simulationResults,
        assets: socialPosts
      }
    });

    return { 
      success: true, 
      output: `Campaign orchestrated for ${vName}. Awaiting review.`,
      ticketId: newTicket.id 
    };
  }

  async verify(result: ExecutionResult): Promise<boolean> {
    return result.success;
  }

  async learn(outcome: ExecutionResult, venture: Venture): Promise<void> {
    // Feedback loop
  }

  private async runMarketSimulation(name: string, mission: string) {
    const prompt = `Act as a cynical potential customer for a venture named "${name}" (Mission: ${mission}). What are the top 3 reasons you WOULD NOT use this product? Provide harsh feedback.`;
    const friction = await callOllama(prompt, [{ role: 'system', content: 'You are a Critical Audience Simulator.' }]);
    return `Potential Friction Identified: ${friction}`;
  }

  private async generateStrategy(name: string, mission: string, friction: string) {
    const prompt = `Act as a Marketing Director. We identified these friction points: "${friction}". Design a growth strategy for "${name}" that overcomes these points while staying true to the mission: "${mission}".`;
    return await callOllama(prompt, [{ role: 'system', content: 'You are a Growth Marketing Director.' }]);
  }

  private async draftContent(name: string, strategy: string) {
    const prompt = `Based on this strategy: "${strategy}", draft 3 viral social media posts for "${name}". Include emojis and hashtags.`;
    return await callOllama(prompt, [{ role: 'system', content: 'You are a Creative Content Writer.' }]);
  }
}

// Register
import { skillRegistry } from './registry';
skillRegistry.registerSkillInstance(new MarketingSpecialistSkill());
