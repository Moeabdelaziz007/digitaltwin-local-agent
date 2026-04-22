import { promises as fs } from 'fs';
import path from 'path';
import { ToolDefinition, PluginManifest, PluginManifestSchema } from './plugin-schema';
import { OllamaTool } from '@/lib/ollama-client';

export type ToolExecutor = (
  args: Record<string, unknown>,
  context?: { userId?: string; sessionId?: string }
) => Promise<unknown>;

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools = new Map<string, ToolDefinition>();
  private executors = new Map<string, ToolExecutor>();
  private pluginsDir = path.join(process.cwd(), 'plugins');

  private constructor() {}

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  public registerTool(definition: ToolDefinition, executor: ToolExecutor): void {
    if (!definition.name) {
      throw new Error('Tool definition must include a name.');
    }

    if (this.tools.has(definition.name)) {
      console.warn(`[ToolRegistry] Tool already registered, ignoring duplicate: ${definition.name}`);
      return;
    }

    this.tools.set(definition.name, definition);
    this.executors.set(definition.name, executor);
    console.log(`[ToolRegistry] Registered tool: ${definition.name}`);
  }

  public registerPlugin(manifest: PluginManifest, executors: Record<string, ToolExecutor> = {}): void {
    const parsed = PluginManifestSchema.parse(manifest);
    if (!parsed.enabled) return;

    for (const tool of parsed.tools) {
      const executor = executors[tool.name];
      if (!executor) {
        console.warn(`[ToolRegistry] No executor provided for tool ${tool.name} in plugin ${parsed.id}. Tool will be discoverable but not executable.`);
      }
      this.registerTool(tool, executor ?? (async () => ({ error: `Executor not registered for ${tool.name}` })));
    }
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public getExecutor(name: string): ToolExecutor | undefined {
    return this.executors.get(name);
  }

  public getToolDefinitions(): OllamaTool[] {
    return Array.from(this.tools.values()).map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  public listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public async discoverPlugins(): Promise<void> {
    try {
      await fs.access(this.pluginsDir);
    } catch {
      return;
    }

    const entries = await fs.readdir(this.pluginsDir);
    for (const entry of entries) {
      const pluginPath = path.join(this.pluginsDir, entry);
      try {
        const stat = await fs.stat(pluginPath);
        if (!stat.isDirectory()) continue;

        const manifestPath = path.join(pluginPath, 'manifest.json');
        const manifestText = await fs.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestText) as PluginManifest;
        this.registerPlugin(manifest);
      } catch {
        continue;
      }
    }
  }
}

const globalForTools = globalThis as unknown as { toolRegistry?: ToolRegistry };
export const toolRegistry = globalForTools.toolRegistry ?? ToolRegistry.getInstance();
if (!globalForTools.toolRegistry) globalForTools.toolRegistry = toolRegistry;
