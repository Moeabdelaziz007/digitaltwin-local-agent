import { ISkill, ExecutionResult, SkillMetadata } from './types';
import { TicketEngine } from '../holding/ticket-engine';
import { Venture, Role, Ticket } from '../holding/types';
import { callOllama } from '../ollama-client';
import { executeRecallMemory } from '../memory-engine';

/**
 * src/lib/skills/product-factory.ts
 * Digital Product Factory Engine: Knowledge-to-Asset Monetization
 */

export class ProductFactorySkill extends ISkill {
  id = 'product-factory';
  metadata: SkillMetadata = {
    id: 'product-factory',
    name: 'Digital Product Factory',
    version: '1.2.0',
    description: 'Audits memory and packages knowledge into sellable digital assets.',
    category: 'revenue',
    revenue_impact: 'medium',
    permissions: ['memory_read', 'network'],
    required_tools: ['ollama', 'gumroad-api']
  };

  async scan(): Promise<any[]> {
    const knowledge = await executeRecallMemory('system', 'solved complex technical implementation');
    if (!knowledge || knowledge.includes('No relevant facts found')) return [];
    return [{ knowledge, type: 'knowledge_asset' }];
  }

  async score(items: any[], venture: Venture): Promise<any[]> {
    return items.map(item => ({ ...item, score: 0.7 }));
  }

  async generate(bestOpportunity: any): Promise<any> {
    const prompt = `Convert this technical solution into a sellable digital product: ${bestOpportunity.knowledge}. Output JSON with: name, concept, type (Template/Guide/Snippet), price, description.`;
    const response = await callOllama(prompt, [
      { role: 'system', content: 'You are a Digital Product Expert and Micro-SaaS Consultant.' }
    ]);
    return {
      name: 'AI Automation Starter Kit',
      concept: 'A reusable framework for AI agents.',
      type: 'Template',
      price: 29,
      description: response
    };
  }

  async execute(venture: Venture, role: Role, ticket?: Ticket): Promise<ExecutionResult> {
    if (ticket && ticket.status === 'done') {
      return { success: true, output: 'Product listed successfully on marketplace.' };
    }

    const items = await this.scan();
    const scored = await this.score(items, venture);
    const top = scored[0];

    if (!top) return { success: false, output: 'no_sellable_knowledge_found' };

    const manifest = await this.generate(top);

    const newTicket = await TicketEngine.createTicket(venture, role, {
      title: `[PRODUCT] New Asset: ${manifest.name}`,
      context: `
### Concept: ${manifest.concept}
### Type: ${manifest.type}
### Suggested Price: $${manifest.price}

### Marketing Copy
${manifest.description}
      `,
      status: 'pending',
      metadata: { type: 'digital_product', manifest }
    });

    return { 
      success: true, 
      output: `Digital product '${manifest.name}' drafted. Awaiting listing approval.`,
      ticketId: newTicket.id 
    };
  }

  async verify(result: ExecutionResult): Promise<boolean> {
    return result.success;
  }

  async learn(outcome: ExecutionResult, venture: Venture): Promise<void> {
    // Learning loop
  }
}

// Register
import { skillRegistry } from './registry';
skillRegistry.registerSkillInstance(new ProductFactorySkill());
