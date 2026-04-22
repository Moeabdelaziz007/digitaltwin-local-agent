import { toolRegistry } from './tool-registry';
import { authorizeToolExecution, ToolPermission } from './permission-lattice';
import { obs } from '@/lib/observability/observability-service';

export interface ToolExecutionContext {
  userId?: string;
  sessionId?: string;
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  grantedPermissions: ToolPermission[] = [],
  context?: ToolExecutionContext,
): Promise<unknown> {
  const tool = toolRegistry.getTool(toolName);

  if (!tool) {
    const errorMessage = `[ToolGateway] Tool not found: ${toolName}`;
    obs.log?.('warn', errorMessage);
    throw new Error(errorMessage);
  }

  if (!authorizeToolExecution(tool.permissions ?? [], grantedPermissions)) {
    const errorMessage = `[ToolGateway] Permission denied for tool ${toolName}`;
    obs.log?.('warn', errorMessage);
    throw new Error(errorMessage);
  }

  const executor = toolRegistry.getExecutor(toolName);
  if (!executor) {
    const errorMessage = `[ToolGateway] No executor registered for tool ${toolName}`;
    obs.log?.('warn', errorMessage);
    throw new Error(errorMessage);
  }

  return await obs.trace('tool_execution', {
    attributes: {
      'tool.name': toolName,
      'tool.namespace': tool.namespace ?? 'default',
      'user.id': context?.userId ?? 'unknown',
      'session.id': context?.sessionId ?? 'unknown',
    }
  }, async () => {
    return executor(args, context);
  });
}
