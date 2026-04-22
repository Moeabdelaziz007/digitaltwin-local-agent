import { ventureRegistry } from './venture-registry';
import { skillRegistry } from '../skills/registry';
import { FreelanceArbitrageSkill } from '../skills/freelance-arbitrage';
import { BountyHunterSkill } from '../skills/bounty-hunter';
import { SaaSFactorySkill } from '../skills/saas-factory';
import { ContentMultiplierSkill } from '../skills/content-multiplier';
import { ProductFactorySkill } from '../skills/product-factory';
import { AgentServiceSkill } from '../skills/agent-service';
import { MarketingSpecialistSkill } from '../skills/marketing-specialist';

/**
 * src/lib/holding/venture-engine.ts
 * The Autonomous Venture Engine (AVE): Orchestrates self-executing skills across ventures.
 */

export class VentureEngine {
  private static instance: VentureEngine;
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): VentureEngine {
    if (!VentureEngine.instance) {
      VentureEngine.instance = new VentureEngine();
    }
    return VentureEngine.instance;
  }

  /**
   * Start the heart of the holding protocol
   */
  public start(tickRateMs: number = 3600000) { // Default: 1 hour
    console.log('[AVE] Venture Engine activated. Heartbeat started.');
    this.intervalId = setInterval(() => this.heartbeat(), tickRateMs);
    this.heartbeat(); // Initial run
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('[AVE] Venture Engine deactivated.');
    }
  }

  /**
   * The core loop that triggers self-executing skills for each venture
   */
  private async heartbeat() {
    const ventures = ventureRegistry.listVentures();
    console.log(`[AVE] Heartbeat: Processing ${ventures.length} ventures...`);

    for (const venture of ventures) {
      if (venture.status !== 'active') continue;

      for (const skillId of venture.skills || []) {
        await this.triggerSkill(skillId, venture);
      }
    }
  }

  private async triggerSkill(skillId: string, venture: any) {
    console.log(`[AVE] Triggering skill '${skillId}' for venture '${venture.name}'`);

    try {
      let skillInstance;
      switch (skillId) {
        case 'freelance-arbitrage': skillInstance = new FreelanceArbitrageSkill(); break;
        case 'bounty-hunter': skillInstance = new BountyHunterSkill(); break;
        case 'saas-factory': skillInstance = new SaaSFactorySkill(); break;
        case 'content-multiplier': skillInstance = new ContentMultiplierSkill(); break;
        case 'product-factory': skillInstance = new ProductFactorySkill(); break;
        case 'agent-service': skillInstance = new AgentServiceSkill(); break;
        case 'marketing-specialist': skillInstance = new MarketingSpecialistSkill(); break;
        default: return;
      }

      await (skillInstance as any).execute();
    } catch (e) {
      console.error(`[AVE] Failed to execute skill '${skillId}':`, e);
    }
  }
}

export const ventureEngine = VentureEngine.getInstance();
