/**
 * src/lib/holding/synapse.ts
 * محرك التوجيه العصبي (Synapse Routing): المسؤول عن حقن المهارات والتعليمات ديناميكياً.
 */

import { skillRegistry } from '../skills/registry';
import { tieredMemory } from '../memory/tiered-store';

export class SynapseRouter {
  /**
   * بناء السياق (Context) المثالي للمهمة الحالية
   * يقوم باختيار المهارات اللازمة فقط لتقليل الضوضاء للنموذج اللغوي (LLM)
   */
  public static async assembleContextForTask(taskDescription: string): Promise<string> {
    const allSkills = skillRegistry.getActiveSkills();
    
    // منطق ذكي: البحث عن المهارات التي تتطابق كلماتها المفتاحية مع وصف المهمة
    // مستقبلاً يمكن استخدام Embeddings هنا
    const relevantSkills = allSkills.filter(skill => {
      const keywords = skill.metadata.description.toLowerCase() + " " + skill.metadata.when_to_use.toLowerCase();
      return taskDescription.toLowerCase().split(' ').some(word => word.length > 3 && keywords.includes(word));
    });

    if (relevantSkills.length === 0) {
      console.log(`[Synapse] No specific skills matched for task. Providing general capability.`);
    }

    const context = `
### Current Tactical Capability (Synapse Injected)
You have been injected with the following specific skills to complete this task efficiently:

${relevantSkills.map(s => `
#### ${s.metadata.name}
- Instructions: ${s.instructions}
- Capabilities: ${s.metadata.description}
`).join('\n')}

### Strategic Goal
Maintain the ROI focus of the venture. If these skills are insufficient, request 'Evolution' of your toolset.
`;

    return context;
  }
}
