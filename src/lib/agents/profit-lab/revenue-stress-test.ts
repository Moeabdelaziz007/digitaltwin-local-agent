import { Opportunity } from '@/types/twin';

export interface StressTestResult {
  bull: { revenue: number, survivability: boolean };
  base: { revenue: number, survivability: boolean };
  bear: { revenue: number, survivability: boolean };
  crash: { revenue: number, survivability: boolean };
  blackSwan: { revenue: number, survivability: boolean };
}

export class RevenueStressTest {
  private name = 'The Stress Tester';

  /**
   * Tests every opportunity against 5 market scenarios.
   */
  async runScenarios(opportunity: Opportunity): Promise<StressTestResult> {
    console.log(`[${this.name}] Running stress tests for "${opportunity.title}"...`);
    
    // Extract base revenue from estimated_roi string (heuristic)
    const baseRevMatch = (opportunity.estimated_roi || "").match(/\$(\d+)/);
    const baseRev = baseRevMatch ? parseInt(baseRevMatch[1]) : 1000;

    return {
      bull: await this.simulate(baseRev, 1.5),
      base: await this.simulate(baseRev, 1.0),
      bear: await this.simulate(baseRev, 0.5),
      crash: await this.simulate(baseRev, 0.2),
      blackSwan: { revenue: 0, survivability: false }
    };
  }

  private async simulate(base: number, multiplier: number): Promise<{ revenue: number, survivability: boolean }> {
    const revenue = base * multiplier;
    const survivability = revenue > (base * 0.3); // Simple rule: survivable if >30% of base
    return { revenue, survivability };
  }
}
