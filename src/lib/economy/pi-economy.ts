/**
 * src/lib/economy/pi-economy.ts
 * 
 * 🥧 Pi Network Economy Manager
 * 
 * Handles the internal economy of MAS-ZERO agents using Pi Token as the fuel.
 * Agents earn Pi for tasks, pay for infrastructure, and receive salaries.
 */

export interface PiTransaction {
  id: string;
  agentId: string;
  amount: number;
  type: 'salary' | 'task_payment' | 'incentive' | 'infrastructure_cost' | 'capital_injection';
  timestamp: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
}

export class PiEconomyManager {
  private static instance: PiEconomyManager;
  
  // Theoretical Pi Value for simulation (1 Pi = $3.14 for fun)
  private readonly PI_TO_USD = 3.14;

  private constructor() {}

  public static getInstance(): PiEconomyManager {
    if (!PiEconomyManager.instance) {
      PiEconomyManager.instance = new PiEconomyManager();
    }
    return PiEconomyManager.instance;
  }

  /**
   * Convert Pi to USD for dashboard visualization
   */
  public toUSD(piAmount: number): number {
    return piAmount * this.PI_TO_USD;
  }

  /**
   * Convert USD to Pi for internal billing
   */
  public fromUSD(usdAmount: number): number {
    return usdAmount / this.PI_TO_USD;
  }

  /**
   * Calculates the cost of a task in Pi
   */
  public calculateTaskCost(impact: string, complexity: number = 1): number {
    const base = 5; // Base 5 Pi per task
    const multiplier = impact === 'critical' ? 10 : impact === 'high' ? 5 : impact === 'medium' ? 2 : 1;
    return base * multiplier * complexity;
  }

  /**
   * Processes a payment within the agent economy
   */
  public async processPayment(agentId: string, amount: number, type: PiTransaction['type'], description: string): Promise<boolean> {
    console.log(`[PiEconomy] 💸 Processing ${type}: ${amount.toFixed(4)} Pi for Agent ${agentId}`);
    
    // TODO: Integrate with PocketBase 'pi_transactions' collection
    // For now, we simulate success
    return true;
  }

  /**
   * Distributes "Intelligence Rewards" based on ROI performance
   */
  public async distributePerformanceIncentive(agentId: string, roi: number): Promise<void> {
    if (roi > 1.5) {
      const incentive = (roi - 1) * 100; // 100 Pi per 100% extra ROI
      await this.processPayment(agentId, incentive, 'incentive', `Performance bonus for ROI: ${roi.toFixed(2)}`);
    }
  }
}

export const piEconomy = PiEconomyManager.getInstance();
