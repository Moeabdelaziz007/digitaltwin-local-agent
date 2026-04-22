import { ventureRegistry } from './venture-registry';

/**
 * src/lib/holding/budget-monitor.ts
 * Implements "Three Layers of Budget Control" as per Paperclip philosophy.
 */

export interface BudgetConfig {
  monthlyCap: number;   // 100% Full Stop
  warningThreshold: number; // 80% Soft Warning
  currentSpent: number;
}

export class BudgetMonitor {
  private static instance: BudgetMonitor;

  private constructor() {}

  public static getInstance(): BudgetMonitor {
    if (!BudgetMonitor.instance) {
      BudgetMonitor.instance = new BudgetMonitor();
    }
    return BudgetMonitor.instance;
  }

  /**
   * Layer 1-3 Control Check
   */
  public async checkBudget(ventureId: string): Promise<{ allowed: boolean; message?: string }> {
    const venture = ventureRegistry.getVenture(ventureId);
    if (!venture) return { allowed: false, message: 'Venture not found.' };

    this.ensureRateLimitResets(venture);

    const { 
      monthly_limit_usd, spent_this_month_usd,
      daily_limit_usd, spent_today_usd,
      hourly_limit_usd, spent_this_hour_usd 
    } = venture.budget;

    // 1. Monthly Check
    if (spent_this_month_usd >= monthly_limit_usd) {
      return { allowed: false, message: `Monthly budget reached ($${monthly_limit_usd}).` };
    }

    // 2. Daily Check
    if (daily_limit_usd && (spent_today_usd || 0) >= daily_limit_usd) {
      return { allowed: false, message: `Daily rate limit reached ($${daily_limit_usd}).` };
    }

    // 3. Hourly Check
    if (hourly_limit_usd && (spent_this_hour_usd || 0) >= hourly_limit_usd) {
      return { allowed: false, message: `Hourly rate limit reached ($${hourly_limit_usd}).` };
    }

    // Soft Warning at 80% (Monthly)
    const usageRatio = spent_this_month_usd / monthly_limit_usd;
    if (usageRatio >= 0.8) {
      console.warn(`[Budget] WARNING: Venture ${ventureId} at ${Math.round(usageRatio * 100)}% monthly budget.`);
    }

    return { allowed: true };
  }

  private ensureRateLimitResets(venture: any) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const hourStr = now.toISOString().split(':')[0]; // e.g. 2026-04-22T22

    let modified = false;

    if (venture.budget.last_reset_day !== todayStr) {
      venture.budget.spent_today_usd = 0;
      venture.budget.last_reset_day = todayStr;
      modified = true;
    }

    if (venture.budget.last_reset_hour !== hourStr) {
      venture.budget.spent_this_hour_usd = 0;
      venture.budget.last_reset_hour = hourStr;
      modified = true;
    }

    if (modified) {
      ventureRegistry.updateVenture(venture.id, { budget: venture.budget });
    }
  }

  public async recordSpend(ventureId: string, amount: number) {
    const venture = ventureRegistry.getVenture(ventureId);
    if (venture) {
      venture.budget.spent_this_month_usd += amount;
      venture.budget.spent_today_usd = (venture.budget.spent_today_usd || 0) + amount;
      venture.budget.spent_this_hour_usd = (venture.budget.spent_this_hour_usd || 0) + amount;
      
      console.log(`[Budget] Venture ${ventureId} spend updated. Total Month: $${venture.budget.spent_this_month_usd.toFixed(4)}`);
      
      ventureRegistry.updateVenture(ventureId, { budget: venture.budget });
    }
  }
  public static calculateCost(model: string, tokens: number): number {
    const rates: Record<string, number> = {
      'ollama': 0, // Local is free
      'groq': 0.0001,
      'openai': 0.002,
      'claude': 0.003,
      'gemini': 0.0005
    };
    const rate = rates[model] || 0.001;
    return (tokens / 1000) * rate;
  }
}

export const budgetMonitor = BudgetMonitor.getInstance();
