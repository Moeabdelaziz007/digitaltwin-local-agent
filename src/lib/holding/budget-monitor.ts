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

    const { monthly_limit_usd, spent_this_month_usd } = venture.budget;
    const usageRatio = spent_this_month_usd / monthly_limit_usd;

    // Layer 3: Full Stop at 100%
    if (usageRatio >= 1.0) {
      console.error(`[Budget] CRITICAL: Venture ${ventureId} hit 100% budget cap ($${monthlyCap}). STOPPING ALL AGENTS.`);
      return { allowed: false, message: 'Budget limit reached (100%). Full stop enforced.' };
    }

    // Layer 2: Soft Warning at 80%
    if (usageRatio >= 0.8) {
      console.warn(`[Budget] WARNING: Venture ${ventureId} at ${Math.round(usageRatio * 100)}% budget ($${spent_this_month_usd}/$${monthly_limit_usd}). Soft warning issued.`);
      // Logic to trigger notification/ticket could go here
    }

    // Layer 1: Allowed (Under 80%)
    return { allowed: true };
  }

  /**
   * Record token/API cost
   */
  public async recordSpend(ventureId: string, amount: number) {
    const venture = ventureRegistry.getVenture(ventureId);
    if (venture) {
      venture.budget.spent_this_month_usd += amount;
      console.log(`[Budget] Venture ${ventureId} spend updated: $${venture.budget.spent_this_month_usd.toFixed(4)}`);
      
      // Auto-save back to registry (simulated)
      // Note: we need to implement updateVenture in ventureRegistry
      (ventureRegistry as any).updateVenture(ventureId, { budget: venture.budget });
    }
  }
}

export const budgetMonitor = BudgetMonitor.getInstance();
