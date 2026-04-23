import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import pb from '../pocketbase-client';
import { MercorBridgeSkill } from './mercor-bridge';
import { BountyHunterSkill } from './bounty-hunter';
import { MarketSniperSkill } from './market-sniper';
import { SkillMetadata, ISkill } from './types';

export const SkillSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  when_to_use: z.string(),
  permissions: z.array(z.string()),
  required_tools: z.array(z.string()),
  input_schema: z.object({}).passthrough().optional(),
  output_schema: z.object({}).passthrough().optional(),
  safety_notes: z.string().optional(),
  // Performance Metrics (Merged from profit-lab)
  successRate: z.number().optional().default(0),
  totalEarnings: z.number().optional().default(0),
  totalRuns: z.number().optional().default(0),
  lastUsed: z.string().optional(),
  status: z.enum(['experimental', 'verified', 'deprecated']).optional().default('experimental'),
  // Digital Twin Venture Lab Upgrades
  argument_hint: z.string().optional(),
  invocation_flow: z.array(z.string()).optional(),
  next_skills: z.array(z.string()).optional(),
  required_before: z.array(z.string()).optional(),
  blocks_if_missing: z.array(z.string()).optional(),
  revenue_impact: z.enum(['critical', 'high', 'medium', 'low']).optional().default('medium'),
  category: z.string().optional()
});

// Removed duplicate SkillMetadata type

export type SkillListItem = SkillMetadata & { id: string };

export interface RegisteredSkill {
  id?: string;
  metadata: SkillMetadata;
  instructions: string;
  instance?: ISkill;
  examples?: string[];
  enabled?: boolean;
}

export class SkillRegistry {
  private static instance: SkillRegistry;
  private skills: Map<string, RegisteredSkill> = new Map();
  private skillsDir = path.join(process.cwd(), 'skills');

  constructor() {}

  public static getInstance(): SkillRegistry {
    if (!(globalThis as any)._skillRegistry) {
      (globalThis as any)._skillRegistry = new SkillRegistry();
    }
    return (globalThis as any)._skillRegistry;
  }

  /**
   * تسجيل مهارة جديدة كـ Plugin (Strict Interface)
   */
  public registerSkillInstance(instance: ISkill): void {
    this.skills.set(instance.id, {
      id: instance.id,
      metadata: instance.metadata,
      instructions: instance.metadata.description,
      instance
    });
    console.log(`[SkillRegistry] Plugin Registered: ${instance.id} (v${instance.metadata.version})`);
  }

  /**
   * The Evolution Loop: Moved to ISkill.learn
   */

  /**
   * Scans the skills directory for file-based skill definitions.
   */
  public async discover(): Promise<void> {
    try {
      const folders = await fs.readdir(this.skillsDir);
      for (const folder of folders) {
        if ((await fs.stat(path.join(this.skillsDir, folder))).isDirectory()) {
          await this.loadSkill(folder);
        }
      }
      console.log(`[SkillRegistry] Discovered ${this.skills.size} skills total.`);
    } catch (error) {
      console.warn('[SkillRegistry] No skills directory found or error during discovery.');
    }
  }

  private async loadSkill(name: string): Promise<void> {
    try {
      const skillPath = path.join(this.skillsDir, name);
      const metadataStr = await fs.readFile(path.join(skillPath, 'skill.json'), 'utf-8');
      const instructions = await fs.readFile(path.join(skillPath, 'instructions.md'), 'utf-8');
      
      const rawMetadata = JSON.parse(metadataStr);
      const parsed = SkillSchema.safeParse(rawMetadata);

      if (!parsed.success) return;

      this.skills.set(name, {
        metadata: parsed.data,
        instructions,
        examples: [],
        enabled: true
      });
    } catch (error) {}
  }

  public getActiveSkillsContext(): string {
    const active = Array.from(this.skills.values()).filter(s => s.enabled);
    if (active.length === 0) return '';

    return `
### Available Skills
${active.map(s => `
#### ${s.metadata.name} (v${s.metadata.version})
- **Success Rate**: ${((s.metadata.successRate || 0) * 100).toFixed(1)}%
- **Capabilities**: ${s.metadata.description}
`).join('\n')}
`;
  }

  public getSkill(name: string): RegisteredSkill | undefined {
    return this.skills.get(name);
  }

  /**
   * Returns all skills that are currently enabled.
   */
  public getActiveSkills(): RegisteredSkill[] {
    return Array.from(this.skills.values()).filter(s => s.enabled !== false);
  }

  public listSkills(): SkillListItem[] {
    return Array.from(this.skills.entries()).map(([id, skill]) => ({
      ...skill.metadata,
      id,
    }));
  }
}

// Singleton Protection
const globalForSkills = globalThis as unknown as {
  skillRegistry: SkillRegistry | undefined;
};

export const skillRegistry = globalForSkills.skillRegistry ?? new SkillRegistry();

if (process.env.NODE_ENV !== 'production') {
  globalForSkills.skillRegistry = skillRegistry;
}
