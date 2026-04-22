import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SkillRegistry, SkillSchema } from './registry';
import { promises as fs } from 'fs';
import path from 'path';

vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
    readFile: vi.fn(),
  },
}));

describe('SkillRegistry', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    // Reset singleton or create new instance for test if possible
    // Since it's a singleton, we might need to clear the internal map
    registry = SkillRegistry.getInstance();
    (registry as any).skills = new Map();
    vi.clearAllMocks();
  });

  it('should validate skill metadata correctly', () => {
    const validMetadata = {
      name: "Test Skill",
      version: "1.0.0",
      description: "Test",
      when_to_use: "Always",
      permissions: ["memory_read"],
      required_tools: [],
      input_schema: {},
      output_schema: {},
      safety_notes: "None"
    };
    const result = SkillSchema.safeParse(validMetadata);
    expect(result.success).toBe(true);
  });

  it('should handle missing skills directory gracefully', async () => {
    (fs.access as any).mockRejectedValue(new Error('ENOENT'));
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    await registry.discover();
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Skills directory not found'));
    expect(registry.getActiveSkills().length).toBe(0);
  });

  it('should load a valid skill from directory', async () => {
    const skillName = 'web-search';
    const mockMetadata = {
      name: "Web Search",
      version: "1.2.0",
      description: "Search the web",
      when_to_use: "When info is missing",
      permissions: ["network"],
      required_tools: ["google_search"],
      input_schema: {},
      output_schema: {},
      safety_notes: "Be careful"
    };

    (fs.access as any).mockResolvedValue(undefined);
    (fs.readdir as any).mockResolvedValue([skillName]);
    (fs.stat as any).mockResolvedValue({ isDirectory: () => true });
    (fs.readFile as any).mockImplementation((p: string) => {
      if (p.endsWith('skill.json')) return JSON.stringify(mockMetadata);
      if (p.endsWith('instructions.md')) return '# Instructions';
      if (p.endsWith('examples.json')) return JSON.stringify(['example 1']);
      return '';
    });

    await registry.discover();

    const skill = registry.getSkill(skillName);
    expect(skill).toBeDefined();
    expect(skill?.metadata.version).toBe('1.2.0');
    expect(skill?.instructions).toBe('# Instructions');
  });
});
