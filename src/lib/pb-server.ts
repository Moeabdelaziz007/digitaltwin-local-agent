import PocketBase from 'pocketbase';
import { env } from '@/lib/env';

/**
 * Singleton PocketBase client for server-side usage.
 * Prevents "Operation not permitted" and socket exhaustion in long-running contexts.
 */
class PBServer {
  private static instance: PocketBase;

  private constructor() {}

  public static getInstance(): PocketBase {
    if (!PBServer.instance) {
      PBServer.instance = new PocketBase(env.POCKETBASE_URL);
      PBServer.instance.autoCancellation(false);
    }
    return PBServer.instance;
  }
}

export const serverPB = PBServer.getInstance();

export function getServerPB() {
  return serverPB;
}
