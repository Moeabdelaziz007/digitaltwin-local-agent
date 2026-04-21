/**
 * Canonicalizes identity values before they are used in PocketBase queries.
 *
 * Note: this is intentionally backward-compatible (currently a trim-only mapping)
 * so we do not break existing records that were persisted with historical IDs.
 */
export function asPbUserId(userId: string): string {
  return userId.trim();
}

