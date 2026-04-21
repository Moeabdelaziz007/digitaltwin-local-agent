/**
 * /src/lib/agents/profit-lab/meta-architect.ts
 * The MetaArchitect agent (MAS-ZERO inspired) dynamically designs SOPs.
 */

import { callOllama } from '@/lib/ollama-client';
import { sopEngine, SOPStep } from '@/lib/agents/sop-engine';

export interface ArchitecturalDesign {
  sopName: string;
  steps: SOPStep[];
  reasoning: string;
}

export class MetaArchitect {
  /**
   * Designs a custom Standard Operating Procedure (SOP) for a specific venture or goal.
   * Following MAS-ZERO, it decomposes the problem into atomic agentic steps.
   */
  async designVentureSOP(goal: string, context: Record<string, any> = {}): Promise<ArchitecturalDesign> {
    console.log(`[MetaArchitect] Designing custom MAS configuration for goal: ${goal}...`);

    const prompt = `
      You are the MetaArchitect (inspired by MAS-ZERO research). 
      Your goal is to design a Multi-Agent System (MAS) configuration to achieve: "${goal}".
      
      CONTEXT: ${JSON.stringify(context)}

      RULES:
      1. Decompose the goal into 3-5 logical steps.
      2. Assign each step to one of these agents: "Scout", "Strategist", "Builder", "CEO".
      3. Ensure each step has a clear "id", "name", and "description".
      4. Return ONLY a JSON object:
      {
        "sopName": "DynamicVenture_" + string,
        "steps": [{"id": string, "name": string, "description": string, "agent": string, "status": "pending"}],
        "reasoning": string
      }
    `;

    try {
      const response = await callOllama(prompt);
      const design = this.parseDesign(response);
      
      console.log(`[MetaArchitect] Successfully designed SOP: ${design.sopName}`);
      return design;
    } catch (error) {
      console.error('[MetaArchitect] Design failed, falling back to default:', error);
      return {
        sopName: 'FallbackVenture',
        steps: [
          { id: '1', name: 'Analysis', description: 'Analyze the fallback goal', agent: 'Strategist', status: 'pending' },
          { id: '2', name: 'Execution', description: 'Execute the basic plan', agent: 'Builder', status: 'pending' }
        ],
        reasoning: 'Fallback due to design error.'
      };
    }
  }

  private parseDesign(content: string): ArchitecturalDesign {
    try {
      const match = content.match(/\{[\s\S]*\}/);
      return JSON.parse(match ? match[0] : '{}');
    } catch {
      throw new Error('Failed to parse ArchitecturalDesign JSON');
    }
  }
}

export const metaArchitect = new MetaArchitect();
