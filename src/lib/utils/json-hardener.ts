/**
 * src/lib/utils/json-hardener.ts
 * معالج JSON متطور: قادر على استخراج البيانات حتى من الردود المليئة بالضجيج.
 */

export class JSONHardener {
  /**
   * استخراج أول كائن JSON صالح من نص عشوائي
   */
  public static extract<T>(raw: string): T {
    try {
      // 1. محاولة البحث عن بلوكات Markdown
      const mdMatch = raw.match(/```json\s*([\s\S]*?)\s*```/);
      if (mdMatch) {
        return JSON.parse(mdMatch[1]);
      }

      // 2. محاولة البحث عن أول قوس وآخر قوس (التوازن)
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        const candidate = raw.substring(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(candidate);
        } catch (e) {
          // إذا فشل، نحاول التحليل العميق للأقواس المتوازنة
          return this.parseBalanced(raw, firstBrace) as T;
        }
      }

      throw new Error('No JSON structure found in raw text');
    } catch (error) {
      console.warn('[JSONHardener] Standard extraction failed, falling back to raw string.');
      // إذا فشل كل شيء، نعيد الكائن كـ output نصي
      return { output: raw } as any;
    }
  }

  /**
   * تحليل الأقواس المتوازنة للتعامل مع الـ JSON المعقد
   */
  private static parseBalanced(text: string, startIdx: number): any {
    let depth = 0;
    for (let i = startIdx; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) {
          const candidate = text.substring(startIdx, i + 1);
          try {
            return JSON.parse(candidate);
          } catch {
            continue; // واصل البحث إذا كان القوس غير متوافق
          }
        }
      }
    }
    throw new Error('Balanced JSON not found');
  }
}
