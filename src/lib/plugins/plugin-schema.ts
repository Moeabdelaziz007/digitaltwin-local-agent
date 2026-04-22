import { z } from 'zod';

export const ToolParameterSchema = z.object({
  type: z.literal('object'),
  properties: z.record(
    z.object({
      type: z.string(),
      description: z.string(),
    })
  ),
  required: z.array(z.string()),
});

export const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  namespace: z.string().optional(),
  permissions: z.array(z.enum(['memory_read', 'memory_write', 'network', 'filesystem', 'admin'])).optional(),
  parameters: ToolParameterSchema,
});

export const PluginManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  namespace: z.string().default('default'),
  description: z.string(),
  enabled: z.boolean().default(true),
  permissions: z.array(z.enum(['memory_read', 'memory_write', 'network', 'filesystem', 'admin'])).default([]),
  tools: z.array(ToolDefinitionSchema),
});

export type ToolPermission = z.infer<typeof ToolDefinitionSchema>['permissions'] extends Array<infer P> ? P : never;
export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;
export type PluginManifest = z.infer<typeof PluginManifestSchema>;
