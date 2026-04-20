import PocketBase from 'pocketbase';

/**
 * STEP 4: PocketBase Client Hardening
 * Ensures the instance is created ONCE per module load as a singleton.
 * For server-side usage, we use getServerPB() in memory-engine.ts 
 * to prevent token bleeding between concurrent requests.
 */
const pb = new PocketBase(
  process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090'
);

// Disable auto-cancellation to prevent interference in concurrent micro-tasks.
pb.autoCancellation(false);

export default pb;
