import { callOllama } from '../ollama-client';
import { executeRecallMemory } from '../memory-engine';
import { skillRegistry } from './registry';
import { ExecutionResult } from '@/types/agent-skills';

/**
 * src/lib/skills/product-factory.ts
 * Digital Product Factory (Refactored for AHP)
 */

export const productFactorySkill = {
  id: 'product-factory',
  instructions: `
    You are a Digital Product Expert. 
    Audit memory for technical solutions and package them into sellable digital products.
  `,
  async execute(context: Record<string, any>): Promise<ExecutionResult> {
    const solvedProblems = await executeRecallMemory('system', 'solved problem code implementation');

    if (!solvedProblems || solvedProblems.includes('No relevant facts found')) {
      return { success: false, error: 'no_sellable_knowledge_found' };
    }

    const prompt = `Package this solution as a digital product: ${solvedProblems}`;
    const productManifest = await callOllama(prompt, [
      { role: 'system', content: 'You are an expert at digital product monetization.' }
    ]);

    return {
      success: true,
      output: productManifest,
      metadata: { timestamp: Date.now() }
    };
  }
};

// Register in AHP Registry
skillRegistry.registerSkill({
  id: productFactorySkill.id,
  metadata: {
    name: 'Digital Product Factory',
    version: '1.1.0',
    description: 'Packages knowledge into sellable digital products.',
    when_to_use: 'When reusable solutions are found in memory.',
    permissions: ['memory_read', 'network'],
    required_tools: ['ollama'],
    category: 'revenue',
    revenue_impact: 'medium'
  },
  instructions: productFactorySkill.instructions
});
