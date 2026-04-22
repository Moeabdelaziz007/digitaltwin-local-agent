import { promises as fs } from 'fs';
import path from 'path';
import { skillRegistry } from '../skills/registry';
import { Role } from './types';

export interface SynapseConfig {
  context: string;
  provider: 'ollama' | 'groq' | 'openai' | 'claude' | 'gemini';
  model: string;
}

export class SynapseRouter {
  /**
   * بناء الإعدادات المثالية للمهمة (المزود + السياق)
   */
  public static async resolveConfig(role: Role, taskDescription: string): Promise<SynapseConfig> {
    const allSkills = skillRegistry.getActiveSkills();
    
    // قراءة الدستور (SOUL.md)
    let soul = '';
    try {
      soul = await fs.readFile(path.join(process.cwd(), '.mas-zero', 'soul.md'), 'utf-8');
    } catch (e) {
      console.warn('[Synapse] SOUL.md not found. Proceeding with default identity.');
    }

    // منطق اختيار المهارات
    const relevantSkills = allSkills.filter(skill => {
      const keywords = skill.metadata.description.toLowerCase() + " " + skill.metadata.when_to_use.toLowerCase();
      return taskDescription.toLowerCase().split(' ').some(word => word.length > 3 && keywords.includes(word));
    });

    const context = `
### SYSTEM SOUL (Mandatory Boundaries)
${soul}

### Injected Skills
${relevantSkills.map(s => `- ${s.metadata.name}: ${s.instructions}`).join('\n')}
`;

    // درس Hermes: اختيار المزود بناءً على الدور أو تعقيد المهمة
    let provider = role.provider_hint || 'ollama';
    let model = 'llama3'; // افتراضي لـ Ollama

    if (provider === 'groq') {
      model = 'llama-3.3-70b-versatile';
    } else if (provider === 'claude') {
      model = 'claude-3-5-sonnet-latest';
    }

    return { context, provider, model };
  }
}
