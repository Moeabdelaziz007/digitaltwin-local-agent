/**
 * src/lib/opportunity/cache.ts
 * Uses Next.js Data Cache — free, no Redis needed.
 */

export const CACHE_TOPOLOGY = {
  'market-signals': {
    revalidate: 3600,    // 1 hour — market moves slowly
    tags: ['market'],
  },
  'github-signals': {
    revalidate: 900,     // 15 min — GitHub issues change often
    tags: ['github'],
  },
  'user-signals': {
    revalidate: 300,     // 5 min — user context is freshest
    tags: ['user'],
  },
  'hn-signals': {
    revalidate: 1800,    // 30 min — HN daily rhythm
    tags: ['hn'],
  },
};

/**
 * Wrap every fetch with topology-aware caching using Next.js native cache.
 * @param url The target URL
 * @param tier The cache tier from CACHE_TOPOLOGY
 */
export async function cachedFetch(url: string, tier: keyof typeof CACHE_TOPOLOGY) {
  const config = CACHE_TOPOLOGY[tier];
  return fetch(url, { next: config }); // Next.js handles the cache automatically
}
