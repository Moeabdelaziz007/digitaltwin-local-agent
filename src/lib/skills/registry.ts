import { promises as fs } from 'fs';
import path from 'path';

export interface SkillMetadata {
  name: string;
  description: string;
  version: string;
  when_to_use: string;
  required_tools: string[];
  input_contract: Record<string, any>;
  output_contract: Record<string, any>;
  safety_notes: string;
}

export interface Skill {
  metadata: SkillMetadata;
  instructions: string;
  examples: string[];
}

export class SkillRegistry {
  private static instance: SkillRegistry;
  private skills: Map<string, Skill> = new Map();
  private skillsDir = path.join(process.cwd(), 'skills');

  private constructor() {}

  public static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry();
    }
    return SkillRegistry.instance;
  }

  /**
   * Scan skills/ directory and load manifest + instructions
   */
  public async discover(): Promise<void> {
    try {
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
      
      let examples: string[] = [];
      try {
        const examplesStr = await fs.readFile(path.join(skillPath, 'examples.json'), 'utf-8');
        examples = JSON.parse(examplesStr);
      } catch {
        // Examples are optional
      }

      this.skills.set(name, {
        metadata: JSON.parse(metadataStr),
        instructions,
        examples
      });
      
      console.log(`[SkillRegistry] Loaded skill: ${name}`);
    } catch (error) {
      console.error(`[SkillRegistry] Failed to load skill ${name}:`, error);
    }
  }

  public getActiveSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  public getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }
}

export const skillRegistry = SkillRegistry.getInstance();
