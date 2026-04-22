/**
 * src/lib/holding/budget-monitor.ts
 * مراقب الميزانية: حساب استهلاك التوكنز وتحويلها إلى تكلفة مالية تقديرية.
 */

export class BudgetMonitor {
  // أسعار تقديرية لكل 1000 توكن (لأغراض الحساب المحلي)
  private static PRICES = {
    'ollama': 0.0, // تشغيل محلي مجاني
    'groq-llama3-70b': 0.0007, 
    'openai-gpt4': 0.03
  };

  /**
   * حساب تكلفة العملية
   */
  public static calculateCost(model: string, tokens: number): number {
    const rate = (this.PRICES as any)[model] || 0;
    return (tokens / 1000) * rate;
  }

  /**
   * هل المشروع تجاوز الميزانية؟
   */
  public static isOverBudget(spent: number, limit: number): boolean {
    return spent >= limit;
  }
}
