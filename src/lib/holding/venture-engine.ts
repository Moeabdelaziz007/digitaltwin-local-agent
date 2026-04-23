import { ventureRegistry } from './venture-registry';
import { skillRegistry } from '../skills/registry';
import { FreelanceArbitrageV2Skill } from '../skills/freelance-arbitrage-v2';
import { BountyHunterSkill } from '../skills/bounty-hunter';
import { SaaSFactorySkill } from '../skills/saas-factory';
import { ContentMultiplierSkill } from '../skills/content-multiplier';
import { ProductFactorySkill } from '../skills/product-factory';
import { AgentServiceSkill } from '../skills/agent-service';
import { MarketingSpecialistSkill } from '../skills/marketing-specialist';
import { MercorBridgeSkill } from '../skills/mercor-bridge';
import { revenueFlywheel } from '../revenue-flywheel';

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
    
    // Start the Strategic Revenue Flywheel
    revenueFlywheel.start();
    
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

    // Parallel execution across all ventures
    await Promise.all(ventures.map(async (venture) => {
      if (venture.status !== 'active') return;

      console.log(`[AVE] Scanning for opportunities in venture: ${venture.name}`);

      // 1. Identify "Revenue-Generating" skills (The Hunter Mode)
      const revenueSkills = (venture.skills || []).filter(sid => {
        const meta = skillRegistry.getSkill(sid)?.metadata;
        return meta?.category === 'revenue';
      });

      // 2. Scan for opportunities without spending (Zero-Cost Scan)
      for (const skillId of revenueSkills) {
        await this.triggerHunter(skillId, venture);
      }

      // 3. Regular Skill Execution
      const otherSkills = (venture.skills || []).filter(sid => !revenueSkills.includes(sid));
      const skillPromises = otherSkills.map(skillId => 
        this.triggerSkill(skillId, venture)
      );
      
      await Promise.all(skillPromises);
    }));
  }

  private async triggerHunter(skillId: string, venture: any) {
    console.log(`[AVE][Hunter] Searching for new profit leads with '${skillId}'`);
    
    try {
      const skillInstance = this.getSkillInstance(skillId);
      if (!skillInstance || !(skillInstance as any).scan) return;

      const opportunities = await (skillInstance as any).scan();
      if (opportunities && opportunities.length > 0) {
        console.log(`[AVE][Hunter] Found ${opportunities.length} new opportunities for ${venture.name}!`);
        // The skill instance will handle creating tickets inside its scan/execute logic
      }
    } catch (e) {
      console.error(`[AVE][Hunter] Scan failed for '${skillId}':`, e);
    }
  }

  private async triggerSkill(skillId: string, venture: any) {
    console.log(`[AVE] Executing operational skill '${skillId}' for '${venture.name}'`);

    try {
      const skillInstance = this.getSkillInstance(skillId);
      if (!skillInstance) return;

      // Find the best role to execute this skill
      const role = venture.org_chart.find((r: any) => r.capabilities?.includes(skillId)) || venture.org_chart[0];
      
      if (!role) {
        console.warn(`[AVE] No role found to execute '${skillId}' for venture '${venture.name}'`);
        return;
      }

      await (skillInstance as any).execute(venture, role);
    } catch (e) {
      console.error(`[AVE] Failed to execute skill '${skillId}':`, e);
    }
  }

  private getSkillInstance(skillId: string) {
    switch (skillId) {
      case 'freelance-arbitrage': return new FreelanceArbitrageV2Skill();
      case 'bounty-hunter': return new BountyHunterSkill();
      case 'saas-factory': return new SaaSFactorySkill();
      case 'content-multiplier': return new ContentMultiplierSkill();
      case 'product-factory': return new ProductFactorySkill();
      case 'agent-service': return new AgentServiceSkill();
      case 'marketing-specialist': return new MarketingSpecialistSkill();
      case 'mercor-bridge': return new MercorBridgeSkill();
      case 'mercor-referral': return new MercorBridgeSkill(); // Map old ID to new Bridge for backward compatibility
      default: return null;
    }
  }
}

export const ventureEngine = VentureEngine.getInstance();
