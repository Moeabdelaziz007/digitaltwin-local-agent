import { promises as fs } from 'fs';
import path from 'path';
import { skillRegistry } from '../skills/registry';
import { Role, Venture } from './types';

export interface SynapseConfig {
  context: string;
  provider: 'ollama' | 'groq' | 'openai' | 'claude' | 'gemini';
  model: string;
}

export class SynapseRouter {
  /**
   * بناء الإعدادات المثالية للمهمة (المزود + السياق)
   */
  public static async resolveConfig(role: Role, taskDescription: string, venture?: Venture): Promise<SynapseConfig> {
    const allSkills = skillRegistry.getActiveSkills();
    
    // قراءة الدستور (SOUL.md)
    let soul = '';
    try {
      soul = await fs.readFile(path.join(process.cwd(), '.mas-zero', 'soul.md'), 'utf-8');
    } catch (e) {
      console.warn('[Synapse] SOUL.md not found. Proceeding with default identity.');
    }

    // Goal Alignment Layer: ربط المهمة بالمهمة الكبرى للشركة
    const mission = venture?.mission_statement || 'Standard Opportunity Capture';
    const alignmentPrompt = `
      AS CEO, rate the alignment of this task [${taskDescription}] with the mission [${mission}].
      Return JSON: { "score": 0.0 to 1.0, "reason": "..." }
    `;
    // ملاحظة: هنا يمكن استدعاء LLM سريع للتقييم، حالياً سنفترض التوافق إذا لم يتوفر الـ Venture
    const relevantSkills = allSkills.filter(skill => {
      const keywords = (skill.metadata.description + " " + (skill.metadata.when_to_use || "")).toLowerCase();
      return taskDescription.toLowerCase().split(' ').some(word => word.length > 3 && keywords.includes(word));
    });

    const context = `
### SYSTEM SOUL (Mandatory Boundaries)
${soul}

### COMPANY MISSION
${mission}

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
