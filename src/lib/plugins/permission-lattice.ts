export type ToolPermission = 'memory_read' | 'memory_write' | 'network' | 'filesystem' | 'admin';

export const DEFAULT_PERMISSION_GRANT: ToolPermission[] = ['memory_read', 'memory_write'];

export function authorizeToolExecution(
  requiredPermissions: ToolPermission[] = [],
  grantedPermissions: ToolPermission[] = []
): boolean {
  if (requiredPermissions.length === 0) return true;
  return requiredPermissions.every((permission) => grantedPermissions.includes(permission));
}
