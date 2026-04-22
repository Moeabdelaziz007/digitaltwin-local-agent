import { promises as fs } from 'fs';
import path from 'path';

import { z } from 'zod';

export const SkillSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  when_to_use: z.string(),
  permissions: z.array(z.enum(['memory_read', 'memory_write', 'network', 'filesystem'])),
  required_tools: z.array(z.string()),
  input_schema: z.object({}).passthrough(),
  output_schema: z.object({}).passthrough(),
  safety_notes: z.string(),
  // Digital Twin Venture Lab Upgrades
  argument_hint: z.string().optional(),
  invocation_flow: z.array(z.string()).optional(),
  next_skills: z.array(z.string()).optional(),
  required_before: z.array(z.string()).optional(),
  blocks_if_missing: z.array(z.string()).optional(),
  revenue_impact: z.enum(['critical', 'high', 'medium', 'low']).optional()
});

export type SkillMetadata = z.infer<typeof SkillSchema>;

export interface Skill {
  metadata: SkillMetadata;
  instructions: string;
  examples: string[];
  enabled: boolean;
}

export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();
  private skillsDir = path.join(process.cwd(), 'skills');

  constructor() {}

  /**
   * تسجيل مهارة جديدة ديناميكياً (مستوردة مثلاً)
   */
  public registerSkill(skill: Partial<Skill> & { id: string }): void {
    const fullSkill: Skill = {
      metadata: {
        name: skill.metadata?.name || skill.id,
        version: skill.metadata?.version || '1.0.0',
        description: skill.metadata?.description || '',
        when_to_use: skill.metadata?.when_to_use || 'Always',
        permissions: skill.metadata?.permissions || [],
        required_tools: skill.metadata?.required_tools || [],
        input_schema: {},
        output_schema: {},
        safety_notes: skill.metadata?.safety_notes || 'Safe to use',
      },
      instructions: skill.instructions || '',
      examples: skill.examples || [],
      enabled: true
    };

    this.skills.set(skill.id, fullSkill);
    console.log(`[SkillRegistry] Dynamically registered skill: ${skill.id}`);
  }

  /**
   * Scan skills/ directory and load manifest + instructions
   */
  public async discover(): Promise<void> {
    try {
      // Phase 2 Hardening: Check if directory exists first
      try {
        await fs.access(this.skillsDir);
      } catch {
        console.warn(`[SkillRegistry] Warning: Skills directory not found at ${this.skillsDir}. Starting with empty skill set.`);
        return;
      }

      const folders = await fs.readdir(this.skillsDir);
      for (const folder of folders) {
        const folderPath = path.join(this.skillsDir, folder);
        const stats = await fs.stat(folderPath);

        if (stats.isDirectory()) {
          await this.loadSkill(folder);
        }
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

      if (!parsed.success) {
        console.error(`[SkillRegistry] Validation failed for ${name}:`, parsed.error.format());
        return;
      }

      let examples: string[] = [];
      try {
        const examplesStr = await fs.readFile(path.join(skillPath, 'examples.json'), 'utf-8');
        examples = JSON.parse(examplesStr);
      } catch (e) { 
        // Examples are optional, but we should log if it's a parsing error vs missing file
        if ((e as { code?: string }).code !== 'ENOENT') {
          console.warn(`[SkillRegistry] Optional examples for ${name} failed to load:`, e);
        }
      }

      this.skills.set(name, {
        metadata: parsed.data,
        instructions,
        examples,
        enabled: true
      });
      
      console.log(`[SkillRegistry] Loaded skill: ${name} (v${parsed.data.version})`);
    } catch (error) {
      console.error(`[SkillRegistry] Failed to load skill ${name}:`, error);
    }
  }

  public getActiveSkillsContext(): string {
    const active = Array.from(this.skills.values()).filter(s => s.enabled);
    if (active.length === 0) return '';

    return `
### Available Skills
The following specialized capabilities are available through the Skill Engine:

${active.map(s => `
#### ${s.metadata.name} (v${s.metadata.version})
- **When to use**: ${s.metadata.when_to_use}
- **Permissions**: ${s.metadata.permissions.join(', ')}
- **Capabilities**: ${s.metadata.description}
- **Instructions**: ${s.instructions}
`).join('\n')}
`;
  }

  public getActiveSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  public getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }
}

// Phase 3 Singleton Protection
const globalForSkills = globalThis as unknown as {
  skillRegistry: SkillRegistry | undefined;
};

export const skillRegistry = globalForSkills.skillRegistry ?? new SkillRegistry();

if (process.env.NODE_ENV !== 'production') {
  globalForSkills.skillRegistry = skillRegistry;
}
