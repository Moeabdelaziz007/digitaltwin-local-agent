import { promises as fs } from 'fs';
import path from 'path';
import { skillRegistry } from '../skills/registry';

export type Permission = 'memory_read' | 'memory_write' | 'network' | 'filesystem';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  skills: string[];
  permissions: Permission[];
  status: 'enabled' | 'disabled';
}

export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, PluginManifest> = new Map();
  private pluginsDir = path.join(process.cwd(), 'plugins');

  private constructor() {}

  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  /**
   * Discover and install plugins from the plugins/ directory
   */
  public async discover(): Promise<void> {
    try {
      const folders = await fs.readdir(this.pluginsDir);
      for (const folder of folders) {
        const folderPath = path.join(this.pluginsDir, folder);
        const stats = await fs.stat(folderPath);

        if (stats.isDirectory()) {
          await this.install(folder);
        }
      }
    } catch (error) {
      console.error('[PluginManager] Discovery failed:', error);
    }
  }

  private async install(name: string): Promise<void> {
    try {
      const pluginPath = path.join(this.pluginsDir, name);
      const manifestStr = await fs.readFile(path.join(pluginPath, 'manifest.json'), 'utf-8');
      const manifest: PluginManifest = JSON.parse(manifestStr);

      // Validate required skills exist in the registry
      for (const skillName of manifest.skills) {
        const skill = skillRegistry.getSkill(skillName);
        if (!skill) {
          console.warn(`[PluginManager] Warning: Plugin ${name} requires missing skill: ${skillName}`);
        } else {
          // Capability Validation (Phase 1: Log only as requested)
          this.validateCapabilities(name, skill.metadata.permissions, manifest.permissions);
        }
      }

      this.plugins.set(name, manifest);
      console.log(`[PluginManager] Installed plugin: ${name} (v${manifest.version})`);
    } catch (error) {
      console.error(`[PluginManager] Failed to install plugin ${name}:`, error);
    }
  }

  private validateCapabilities(pluginName: string, skillPerms: string[], pluginPerms: string[]) {
    for (const perm of skillPerms) {
      if (!pluginPerms.includes(perm)) {
        console.warn(`[PluginManager] SECURITY WARN: Skill in ${pluginName} expects capability '${perm}' but plugin only declares '${pluginPerms.join(', ')}'`);
      }
    }
  }

  public getActivePlugins(): PluginManifest[] {
    return Array.from(this.plugins.values()).filter(p => p.status === 'enabled');
  }

  // TODO: Phase 1 requirement - add clear interface spec for runtime proxy
  /**
   * INTERFACE SPEC FOR RUNTIME PROXY (PHASE 2):
   * 1. Every tool call from a skill must pass through an Interceptor.
   * 2. Interceptor checks if the calling Plugin has the required Permission in its manifest.
   * 3. If missing, the tool call is rejected with a SecurityError.
   */
}

export const pluginManager = PluginManager.getInstance();
