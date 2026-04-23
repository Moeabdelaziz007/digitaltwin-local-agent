import { ISkill, ExecutionResult, SkillMetadata } from './types';
import { Venture, Role, Ticket } from '../holding/types';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * AutoDocSkill (The Scribe)
 * Automatically synchronizes documentation with the codebase structure.
 */
export class AutoDocSkill extends ISkill {
  id = 'auto-doc';
  metadata: SkillMetadata = {
    id: 'auto-doc',
    name: 'Auto-Doc Scribe',
    version: '1.0.0',
    description: 'Syncs ARCHITECTURE.md with twin.ts types.',
    category: 'devops',
    revenue_impact: 'low',
    permissions: ['file_write'],
    required_tools: ['FS']
  };

  async scan(): Promise<any[]> {
    // Check if ARCHITECTURE.md needs sync (e.g., if twin.ts was updated after arch)
    return [{ needsSync: true }];
  }

  async score(items: any[]): Promise<any[]> {
    return items.map(item => ({ ...item, priority: 1.0 }));
  }

  async generate(bestOpportunity: any): Promise<any> {
    return { task: 'sync_docs' };
  }

  async execute(venture: Venture, role: Role, ticket?: Ticket): Promise<ExecutionResult> {
    console.log('[AutoDoc] Synchronizing Architecture documentation...');

    try {
      const typesPath = path.join(process.cwd(), 'src', 'types', 'twin.ts');
      const archPath = path.join(process.cwd(), 'ARCHITECTURE.md');

      const typesContent = await fs.readFile(typesPath, 'utf-8');
      const archContent = await fs.readFile(archPath, 'utf-8');

      const interfaces = typesContent.match(/export interface (\w+)/g) || [];
      const interfaceNames = interfaces.map(i => i.replace('export interface ', ''));

      const newDocSection = `\n## 🧬 System Types (Auto-Generated)\nLast sync: ${new Date().toISOString()}\n\n${interfaceNames.map(name => `- \`${name}\``).join('\n')}\n`;

      let updatedArch = archContent;
      if (archContent.includes('## 🧬 System Types')) {
        updatedArch = archContent.replace(/## 🧬 System Types[\s\S]*?(?=\n#|$)/, newDocSection);
      } else {
        updatedArch += `\n${newDocSection}`;
      }

      await fs.writeFile(archPath, updatedArch);

      return {
        success: true,
        output: `Architecture documentation updated with ${interfaceNames.length} types.`
      };
    } catch (e: any) {
      return { success: false, output: `Fail: ${e.message}`, error: e.message };
    }
  }

  async verify(result: ExecutionResult): Promise<boolean> {
    return result.success;
  }

  async learn(outcome: ExecutionResult, venture: Venture): Promise<void> {
    // Log success or failure to tiered memory for future optimization
  }
}

// Self-Register
import { skillRegistry } from './registry';
skillRegistry.registerSkillInstance(new AutoDocSkill());
