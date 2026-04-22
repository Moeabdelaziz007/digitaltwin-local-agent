import { callOllama } from '../ollama-client';
import { skillRegistry } from './registry';
import { ticketEngine } from '../holding/ticket-engine';

/**
 * src/lib/skills/marketing-specialist.ts
 * Reusable Growth Marketing Skill for any Venture
 */

export class MarketingSpecialistSkill {
  static id = 'marketing-specialist';

  async execute(params: { ventureName: string; mission: string }) {
    console.log(`[Marketing Director] Orchestrating campaign for ${params.ventureName}...`);

    // 1. Spawning Sub-Agents & Running Simulations
    const simulationResults = await this.runMarketSimulation(params.ventureName, params.mission);
    
    // 2. Based on simulation, refine strategy
    const strategy = await this.generateStrategy(params.ventureName, params.mission, simulationResults);
    
    // 3. Delegate Content Creation to Sub-Agent
    const socialPosts = await this.draftContent(params.ventureName, strategy);

    // 4. Governance Ticket with Simulation Insights
    const ticket = await ticketEngine.createTicket({
      title: `[Growth] Orchestrated Campaign: ${params.ventureName}`,
      description: `
        **Simulation Insights:**
        ${simulationResults}
        
        **Strategy:**
        ${strategy}
        
        **Campaign Assets:**
        ${socialPosts}
      `,
      priority: 'high',
      metadata: {
        type: 'marketing_director_orchestration',
        simulation_data: simulationResults,
        sub_agents: ['ContentWriter', 'AudienceSimulator']
      }
    });

    return { 
      success: true, 
      output: `Campaign orchestrated after market simulation for ${params.ventureName}.`,
      ticketId: ticket.id 
    };
  }

  private async runMarketSimulation(name: string, mission: string) {
    console.log(`[Marketing] Spawning 'AudiencePersona' sub-agent for simulation...`);
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

// Register as a reusable skill
skillRegistry.registerSkill({
  id: MarketingSpecialistSkill.id,
  metadata: {
    name: 'Growth Marketer',
    version: '1.0.0',
    description: 'Generates organic growth strategies and viral content for any venture.',
    when_to_use: 'After launching a product or when traffic is low.',
    permissions: ['network', 'social_api_access'],
    required_tools: ['ollama', 'jina-reader'],
    category: 'growth',
    revenue_impact: 'high-long-term'
  },
  instructions: 'Analyze trends, draft viral content, and propose distribution channels.'
});
