import { callOllama } from '../ollama-client';
import { skillRegistry, SkillMetadata, SkillListItem } from './registry';

/**
 * src/lib/skills/synapse-router.ts
 * The "Refraction Agent": Semantic Router for skill discovery.
 * Replaces primitive includes() with vectorized-style LLM reasoning.
 */

// SkillWithId is redundant as it's equivalent to SkillListItem from registry.ts
export type SkillWithId = SkillListItem;

export class SynapseRouter {
  /**
   * Find the most relevant skills using Semantic Analysis
   */
  public static async routeTask(taskDescription: string): Promise<SkillListItem[]> {
    const allSkills = skillRegistry.listSkills();
    
    // Prepare a condensed list of skills for the LLM
    const skillMap = allSkills.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      when_to_use: s.when_to_use
    }));

    const prompt = `
      You are the Synapse Router (The Refraction Agent). 
      Your goal is to map a task description to the most appropriate skills from the list below.
      
      TASK DESCRIPTION:
      "${taskDescription}"
      
      AVAILABLE SKILLS:
      ${JSON.stringify(skillMap, null, 2)}
      
      INSTRUCTIONS:
      1. Analyze the intent and requirements of the task.
      2. Identify which skills are most relevant (even if keywords don't match exactly).
      3. Return ONLY a comma-separated list of skill IDs.
      4. If no skill fits, return "none".
    `;

    try {
      const response = await callOllama(prompt, [
        { role: 'system', content: 'You are an expert systems architect and skill router.' }
      ]);

      const recommendedIds = response.toLowerCase().split(',').map(id => id.trim());
      
      if (recommendedIds.includes('none')) return [];

      return allSkills.filter(skill => recommendedIds.includes(skill.id.toLowerCase()));
    } catch (e) {
      console.error('[SynapseRouter] LLM Routing failed. Falling back to keyword matching.', e);
      return this.fallbackKeywordMatch(taskDescription, allSkills);
    }
  }

  private static fallbackKeywordMatch(task: string, skills: SkillListItem[]): SkillListItem[] {
    const words = task.toLowerCase().split(' ');
    return skills.filter(skill => {
      const meta = (skill.description + ' ' + skill.name).toLowerCase();
      return words.some(word => word.length > 3 && meta.includes(word));
    });
  }
}
