import { Opportunity } from '@/types/twin';
import { callOllama } from '@/lib/ollama-client';

export interface StressScenario {
  revenue: number;
  survivability: boolean;
  rationale?: string;
}

export interface StressTestResult {
  bull: StressScenario;
  base: StressScenario;
  bear: StressScenario;
  crash: StressScenario;
  blackSwan: StressScenario;
}

export class RevenueStressTest {
  private name = 'The Stress Tester';

  /**
   * Tests every opportunity against 5 market scenarios.
   */
  async runScenarios(opportunity: Opportunity): Promise<StressTestResult> {
    console.log(`[${this.name}] Running stress tests for "${opportunity.title}"...`);
    
    const baseRevMatch = (opportunity.estimated_roi || "").match(/\$(\d+)/);
    const baseRev = baseRevMatch ? parseInt(baseRevMatch[1]) : 1000;

    const [bull, base, bear, crash] = await Promise.all([
      this.simulate(baseRev, 1.5, 'Bull Market Surge'),
      this.simulate(baseRev, 1.0, 'Stable Market Base'),
      this.simulate(baseRev, 0.5, 'Bear Market Contraction'),
      this.simulate(baseRev, 0.2, 'Market Crash / Recession')
    ]);

    return {
      bull,
      base,
      bear,
      crash,
      blackSwan: { 
        revenue: 0, 
        survivability: false, 
        rationale: 'Complete market failure or platform exploit.' 
      }
    };
  }

  private async simulate(base: number, multiplier: number, scenarioName: string): Promise<StressScenario> {
    const revenue = base * multiplier;
    const survivability = revenue > (base * 0.3);
    
    // Use LLM only for qualitative rationale, not math
    const prompt = `
      [SCENARIO: ${scenarioName}]
      Base Revenue: $${base}
      Projected Revenue: $${revenue}
      Survivability: ${survivability ? 'YES' : 'NO'}

      Provide a 1-sentence business rationale for this outcome. 
      Focus on burn rate and market sentiment.
    `;
    
    try {
      const rationale = await callOllama(prompt);
      return { revenue, survivability, rationale: rationale.trim() };
    } catch {
      return { revenue, survivability, rationale: 'Standard market projection.' };
    }
  }
}
