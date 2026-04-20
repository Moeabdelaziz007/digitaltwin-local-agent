import PocketBase from 'pocketbase';

// Singleton PocketBase client.
// URL defaults to localhost:8090 for local-first development.
const pb = new PocketBase(
  process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090'
);

// Disable auto-cancellation so concurrent requests don't interfere.
pb.autoCancellation(false);

export default pb;
