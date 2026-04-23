import { SaaSFactorySkill } from '../skills/saas-factory';
import { MercorBridgeSkill } from '../skills/mercor-bridge';
import { budgetMonitor } from '../holding/budget-monitor';
import { ventureRegistry } from '../holding/venture-registry';
import { Venture, Role } from '../holding/types';

/**
 * src/lib/revenue-flywheel/index.ts
 * 
 * "The Flywheel" — دائرة الربح الذاتية
 * 
 * 1. Build Micro-SaaS (SaaS Factory)
 * 2. Validate via Mercor Human Bridge
 * 3. Launch & Track
 * 4. Reinvest 50% profits into more ventures
 */

export class RevenueFlywheel {
  private saasFactory = new SaaSFactorySkill();
  private mercorBridge = new MercorBridgeSkill();
  private isSpinning = false;

  public async start(): Promise<void> {
    if (this.isSpinning) return;
    this.isSpinning = true;
    console.log('[Flywheel] 🌀 Revenue Flywheel initiated. Strategy: Build -> Validate -> Launch -> Reinvest.');
    this.spin();
  }

  public stop(): void {
    this.isSpinning = false;
    console.log('[Flywheel] 🛑 Flywheel stopping...');
  }

  private async spin(): Promise<void> {
    while (this.isSpinning) {
      try {
        const ventures = ventureRegistry.listVentures();
        for (const venture of ventures) {
          if (venture.status !== 'active') continue;

          console.log(`[Flywheel] Processing Venture: ${venture.name}`);

          // 1. Build Micro-SaaS (Simulated step in the skill)
          const ctoRole = venture.org_chart.find(r => r.title === 'CTO') || venture.org_chart[0];
          console.log(`[Flywheel] Phase 1: Building SaaS assets...`);
          await this.saasFactory.execute(venture, ctoRole);

          // 2. Human Verification (Mercor Bridge)
          const cfoRole = venture.org_chart.find(r => r.title === 'CFO' || r.department === 'governance') || venture.org_chart[0];
          console.log(`[Flywheel] Phase 2: Requesting Mercor Expert validation...`);
          await this.mercorBridge.execute(venture, cfoRole);

          // 3. Launch Simulation & Revenue Tracking
          console.log(`[Flywheel] Phase 3: Tracking revenue and performance...`);
          const mockRevenue = Math.random() * 500; // Simulated revenue for this cycle
          
          // 4. Reinvest (50%)
          const reinvestment = mockRevenue * 0.5;
          if (reinvestment > 0) {
            await budgetMonitor.allocateReinvestment(venture.id, reinvestment);
          }

          console.log(`[Flywheel] Cycle complete for ${venture.name}. Profit: $${mockRevenue.toFixed(2)} | Reinvested: $${reinvestment.toFixed(2)}`);
        }

        // Wait for next cycle to prevent high-frequency loop
        await new Promise(resolve => setTimeout(resolve, 3600000)); // 1 hour tick
      } catch (e) {
        console.error('[Flywheel] ⚠️ Error in flywheel cycle:', e);
        await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 min before retry
      }
    }
  }
}

export const revenueFlywheel = new RevenueFlywheel();
