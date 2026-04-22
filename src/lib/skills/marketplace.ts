/**
 * src/lib/skills/marketplace.ts
 * جسر المهارات (ClawHub Bridge): المسؤول عن جلب وتكييف المهارات من المصادر الخارجية.
 */

import { skillRegistry } from './registry';

export interface ClawSkill {
  name: string;
  instructions: string;
  description: string;
}

export class SkillMarketplace {
  /**
   * استيراد مهارة من مستودع ClawHub (أو أي مصدر خارجي)
   * مستوحى من كود المستخدم
   */
  public async importClawSkill(skillName: string): Promise<boolean> {
    try {
      console.log(`[ClawHub] Attempting to import skill: ${skillName}...`);
      
      const skillUrl = `https://raw.githubusercontent.com/openclaw/skills/main/${skillName}/SKILL.md`;
      
      // ملاحظة: في بيئة الإنتاج سنحتاج لمعالجة الأخطاء والـ Fallback
      const response = await fetch(skillUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch skill ${skillName} from remote.`);
      }

      const rawContent = await response.text();
      const adapted = this.adaptToMasZeroFormat(skillName, rawContent);

      // تسجيل المهارة في السجل المحلي
      skillRegistry.registerSkill({
        id: `claw-${skillName}`,
        metadata: {
          name: adapted.name,
          description: adapted.description,
          category: 'imported',
          when_to_use: 'When remote capabilities are required'
        },
        instructions: adapted.instructions
      });

      console.log(`[ClawHub] Skill '${skillName}' imported and registered successfully.`);
      return true;
    } catch (error) {
      console.error(`[ClawHub] Error importing skill ${skillName}:`, error);
      return false;
    }
  }

  /**
   * تحويل تنسيق Markdown الخاص بـ OpenClaw إلى مهارة MAS-ZERO
   */
  private adaptToMasZeroFormat(name: string, content: string): ClawSkill {
    // منطق بسيط لاستخراج التعليمات والوصف من Markdown
    // يمكن تطويره لاحقاً باستخدام Regex أكثر تعقيداً
    const instructions = content; // حالياً نأخذ الملف كاملاً
    const description = `Imported skill for ${name}`;

    return {
      name,
      instructions,
      description
    };
  }
}

export const skillMarketplace = new SkillMarketplace();
