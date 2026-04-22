import { describe, it, expect, beforeEach } from 'vitest';
import { toolRegistry } from './tool-registry';
import { executeTool } from './gateway';

describe('ToolRegistry', () => {
  beforeEach(() => {
    (toolRegistry as any).tools = new Map();
    (toolRegistry as any).executors = new Map();
  });

  it('registers and returns tool definitions', () => {
    toolRegistry.registerTool(
      {
        name: 'testTool',
        description: 'A tool for testing',
        namespace: 'test',
        permissions: ['memory_read'],
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Query text' },
          },
          required: ['query'],
        },
      },
      async () => ({ ok: true }),
    );

    const tool = toolRegistry.getTool('testTool');
    expect(tool).toBeDefined();
    expect(tool?.description).toBe('A tool for testing');

    const definitions = toolRegistry.getToolDefinitions();
    expect(definitions).toHaveLength(1);
    expect(definitions[0].function.name).toBe('testTool');
  });

  it('executes tool and enforces permissions', async () => {
    toolRegistry.registerTool(
      {
        name: 'safeTool',
        description: 'Permission aware tool',
        namespace: 'test',
        permissions: ['memory_write'],
        parameters: {
          type: 'object',
          properties: {
            fact: { type: 'string', description: 'Fact to save' },
          },
          required: ['fact'],
        },
      },
      async ({ fact }) => ({ saved: fact }),
    );

    const result = await executeTool('safeTool', { fact: 'hello' }, ['memory_write'], { userId: 'u1', sessionId: 's1' });
    expect(result).toEqual({ saved: 'hello' });

    await expect(() => executeTool('safeTool', { fact: 'hello' }, ['memory_read'], { userId: 'u1' })).rejects.toThrow('Permission denied');
  });
});
