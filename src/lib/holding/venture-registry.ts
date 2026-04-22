/**
 * src/lib/holding/venture-registry.ts
 * سجل مركزي لإدارة الشركات والعمليات المستقلة (AHP)
 */

import { Venture, Goal, Role, Ticket } from './types';
import { promises as fs } from 'fs';
import path from 'path';
import { FreelanceArbitrageBlueprint } from '../revenue-engines/freelance-arbitrage';
import { MicroSaaSFactoryBlueprint } from '../revenue-engines/microsaas-factory';
import { BountyHunterBlueprint } from '../revenue-engines/bounty-hunter';

export class VentureRegistry {
  private static instance: VentureRegistry;
  private ventures: Map<string, Venture> = new Map();

  private constructor() {}

  public static getInstance(): VentureRegistry {
    if (!(globalThis as any)._ventureRegistry) {
      (globalThis as any)._ventureRegistry = new VentureRegistry();
    }
    return (globalThis as any)._ventureRegistry;
  }

  public registerVenture(venture: Venture) {
    this.ventures.set(venture.id, venture);
    this.initVentureStorage(venture.id);
  }

  public getVenture(id: string): Venture | undefined {
    return this.ventures.get(id);
  }

  public listVentures(): Venture[] {
    return Array.from(this.ventures.values());
  }

  /**
   * إطلاق محرك دخل جديد كشركة مستقلة
   */
  public async launchEngine(engineName: string, niche: string): Promise<Venture> {
    const id = `V-${Date.now()}`;
    const mission = `Launch ${engineName} for ${niche}`;
    
    // تحديد الأدوار بناءً على المحرك (تبسيطياً حالياً)
    const orgChart: Role[] = []; 

    const newVenture: Venture = {
      id,
      name: `${engineName} - ${niche}`,
      vision: mission,
      mission_statement: mission,
      status: 'active',
      budget: { monthly_limit_usd: 100, spent_this_month_usd: 0, token_limit: 100000, spent_tokens: 0 },
      org_chart: orgChart,
      goals: [],
      created_at: new Date().toISOString(),
      metadata: { engine: engineName }
    };

    this.registerVenture(newVenture);
    return newVenture;
  }

  private async initVentureStorage(ventureId: string) {
    const baseDir = path.join(process.cwd(), 'ventures', ventureId);
    try {
      await fs.mkdir(baseDir, { recursive: true });
      await fs.writeFile(path.join(baseDir, 'SOUL.md'), '# Venture Soul\nBe profitable.');
      await fs.writeFile(path.join(baseDir, 'JOURNAL.md'), '# Venture Journal\n- [Init] Venture registered.');
    } catch (e) {
      console.warn(`[VentureRegistry] Could not init storage for ${ventureId}`);
    }
  }
}

export const ventureRegistry = VentureRegistry.getInstance();
