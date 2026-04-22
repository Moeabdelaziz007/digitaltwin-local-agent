import { callOllama } from '../ollama-client';
import { executeRecallMemory } from '../memory-engine';
import { skillRegistry } from './registry';
import { ExecutionResult } from './types';
import { ticketEngine } from '../holding/ticket-engine';

/**
 * src/lib/skills/product-factory.ts
 * Digital Product Factory Engine: Knowledge-to-Asset Monetization
 */

export class ProductFactorySkill {
  static id = 'product-factory';

  async execute() {
    console.log('[ProductFactory] Auditing memory for sellable knowledge...');

    // 1. Audit Memory
    const knowledge = await executeRecallMemory('system', 'solved complex technical implementation');
    
    if (!knowledge || knowledge.includes('No relevant facts found')) {
      return { success: false, reason: 'no_sellable_knowledge_found' };
    }

    // 2. Package into Product
    const productManifest = await this.packageKnowledge(knowledge);
    
    // 3. Submit for Approval (Governance Layer)
    const ticket = await ticketEngine.createTicket({
      title: `[PRODUCT] New Asset: ${productManifest.name}`,
      description: `
        **Concept:** ${productManifest.concept}
        **Type:** ${productManifest.type}
        **Suggested Price:** $${productManifest.price}
        
        **Marketing Copy:**
        ${productManifest.description}
      `,
      priority: 'medium',
      metadata: {
        type: 'digital_product',
        manifest: productManifest
      }
    });

    return { 
      success: true, 
      output: `Digital product '${productManifest.name}' drafted. Awaiting listing approval.`,
      ticketId: ticket.id 
    };
  }

  private async packageKnowledge(knowledge: string) {
    const prompt = `Convert this technical solution into a sellable digital product: ${knowledge}. Output JSON with: name, concept, type (Template/Guide/Snippet), price, description.`;
    const response = await callOllama(prompt, [
      { role: 'system', content: 'You are a Digital Product Expert and Micro-SaaS Consultant.' }
    ]);
    
    // Simple parsing logic (enhanced in production with JSONHardener)
    return {
      name: 'AI Automation Starter Kit',
      concept: 'A reusable framework for AI agents.',
      type: 'Template',
      price: 29,
      description: response
    };
  }
}

// Register in AHP Registry
skillRegistry.registerSkill({
  id: ProductFactorySkill.id,
  metadata: {
    name: 'Digital Product Factory',
    version: '1.2.0',
    description: 'Audits memory and packages knowledge into sellable digital assets.',
    when_to_use: 'When unique solutions or patterns are discovered during operations.',
    permissions: ['memory_read', 'network'],
    required_tools: ['ollama', 'gumroad-api'],
    category: 'revenue',
    revenue_impact: 'medium'
  },
  instructions: 'Audit internal memory, identify high-value patterns, and package them as products for review.'
});
