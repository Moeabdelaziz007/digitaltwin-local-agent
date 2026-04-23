import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import pb from '@/lib/pocketbase-client';

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
  successRate: z.number().default(0),
  totalEarnings: z.number().default(0),
  totalRuns: z.number().default(0),
  lastUsed: z.string().optional(),
  status: z.enum(['experimental', 'verified', 'deprecated']).default('experimental'),
  // Digital Twin Venture Lab Upgrades
  argument_hint: z.string().optional(),
  invocation_flow: z.array(z.string()).optional(),
  next_skills: z.array(z.string()).optional(),
  required_before: z.array(z.string()).optional(),
  blocks_if_missing: z.array(z.string()).optional(),
  revenue_impact: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  category: z.string().optional()
});

export type SkillMetadata = z.infer<typeof SkillSchema>;

export interface Skill {
  metadata: SkillMetadata;
  instructions: string;
  examples: string[];
  enabled: boolean;
}

export interface SkillListItem extends SkillMetadata {
  id: string;
}

export class SkillRegistry {
  private static instance: SkillRegistry;
  private skills: Map<string, Skill> = new Map();
  private skillsDir = path.join(process.cwd(), 'skills');

  constructor() {}

  public static getInstance(): SkillRegistry {
    if (!(globalThis as any)._skillRegistry) {
      (globalThis as any)._skillRegistry = new SkillRegistry();
    }
    return (globalThis as any)._skillRegistry;
  }

  /**
   * تسجيل مهارة جديدة ديناميكياً
   */
  public registerSkill(skill: { id: string; metadata?: Partial<SkillMetadata>; instructions?: string; examples?: string[] }): void {
    const fullSkill: Skill = {
      metadata: {
        name: skill.metadata?.name || skill.id,
        version: skill.metadata?.version || '1.0.0',
        description: skill.metadata?.description || '',
        when_to_use: skill.metadata?.when_to_use || 'Always',
        permissions: skill.metadata?.permissions || [],
        required_tools: skill.metadata?.required_tools || [],
        input_schema: skill.metadata?.input_schema || {},
        output_schema: skill.metadata?.output_schema || {},
        safety_notes: skill.metadata?.safety_notes || 'Safe to use',
        revenue_impact: skill.metadata?.revenue_impact || 'low',
        category: skill.metadata?.category || 'general',
        successRate: skill.metadata?.successRate || 0,
        totalEarnings: skill.metadata?.totalEarnings || 0,
        totalRuns: skill.metadata?.totalRuns || 0,
        status: skill.metadata?.status || 'experimental'
      },
      instructions: skill.instructions || '',
      examples: skill.examples || [],
      enabled: true
    };

    this.skills.set(skill.id, fullSkill);
    console.log(`[SkillRegistry] Registered skill: ${skill.id}`);
  }

  /**
   * The Evolution Loop: Exponential Moving Average Evaluation
   */
  public async evaluateSkill(skillId: string, outcome: 'success' | 'fail', value: number = 0) {
    const skill = this.skills.get(skillId);
    if (!skill) return;

    // Exponential moving average: 0.9 * past + 0.1 * new outcome
    const outcomeScore = outcome === 'success' ? 1 : 0;
    skill.metadata.successRate = (0.9 * (skill.metadata.successRate || 0)) + (0.1 * outcomeScore);
    
    if (value > 0) {
      skill.metadata.totalEarnings = (skill.metadata.totalEarnings || 0) + value;
    }
    
    skill.metadata.totalRuns = (skill.metadata.totalRuns || 0) + 1;
    skill.metadata.lastUsed = new Date().toISOString();

    // Persist to PocketBase
    try {
      await pb.collection('agent_skills').update(skillId, skill.metadata);
      console.log(`[SkillRegistry] Skill ${skillId} evolved: Success Rate -> ${(skill.metadata.successRate * 100).toFixed(1)}%`);
    } catch (e) {
      try {
        await pb.collection('agent_skills').create({ id: skillId, ...skill.metadata });
      } catch (err) {
        console.warn(`[SkillRegistry] Persistence failed for ${skillId}, kept in memory.`);
      }
    }
  }

  /**
   * Scan skills/ directory and load manifest + instructions
   */
  public async discover(): Promise<void> {
    try {
      try {
        await fs.access(this.skillsDir);
      } catch {
        return;
      }

      const folders = await fs.readdir(this.skillsDir);
      for (const folder of folders) {
        const folderPath = path.join(this.skillsDir, folder);
        const stats = await fs.stat(folderPath);
        if (stats.isDirectory()) await this.loadSkill(folder);
      }
    } catch (error) {
      console.error('[SkillRegistry] Discovery failed:', error);
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
- **Success Rate**: ${(s.metadata.successRate * 100).toFixed(1)}%
- **Capabilities**: ${s.metadata.description}
`).join('\n')}
`;
  }

  public getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  public listSkills(): SkillListItem[] {
    return Array.from(this.skills.entries()).map(([id, skill]) => ({
      id,
      ...skill.metadata
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
