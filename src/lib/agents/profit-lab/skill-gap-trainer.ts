import { callOllama } from '@/lib/ollama-client';

export interface TrainingPlan {
  skill: string;
  tasks: string[];
  estimated_time: string;
}

export class SkillGapTrainer {
  private name = 'The Trainer';

  /**
   * Generates a self-training plan when a skill gap is detected.
   */
  async generateTrainingPlan(missingSkills: string[]): Promise<TrainingPlan[]> {
    if (missingSkills.length === 0) return [];
    
    console.log(`[${this.name}] Generating training plans for: ${missingSkills.join(', ')}`);

    const prompt = `
      As the Skill Gap Trainer, generate a 3-task micro-training plan for each missing skill.
      SKILLS: ${missingSkills.join(', ')}
      
      Return ONLY a JSON array of TrainingPlan objects:
      [{ "skill": "string", "tasks": ["task1", "task2", "task3"], "estimated_time": "2h" }]
    `;

    try {
      const response = await callOllama(prompt);
      return this.parsePlans(response);
    } catch (error) {
      console.error(`[${this.name}] Training plan generation failed:`, error);
      return [];
    }
  }

  private parsePlans(content: string): TrainingPlan[] {
    try {
      const firstBracket = content.indexOf('[');
      const lastBracket = content.lastIndexOf(']');
      if (firstBracket === -1 || lastBracket === -1) return [];
      
      const jsonStr = content.substring(firstBracket, lastBracket + 1);
      const parsed = JSON.parse(jsonStr);

      if (!Array.isArray(parsed)) return [];

      return parsed.map(plan => ({
        skill: String(plan.skill || 'Unknown Skill'),
        tasks: Array.isArray(plan.tasks) ? plan.tasks.slice(0, 3).map(String) : [],
        estimated_time: String(plan.estimated_time || '1h')
      })).filter(p => p.tasks.length > 0);
    } catch (e) {
      console.error('[SkillGapTrainer] Parsing failed:', e);
      return [];
    }
  }
}
