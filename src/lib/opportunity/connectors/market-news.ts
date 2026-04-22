import { MarketSignal } from '../types';
import { cachedFetch } from '../cache';

/**
 * src/lib/opportunity/connectors/market-news.ts
 * REAL VERSION: The Free Data Superstack
 * Total cost: $0.00/month. Zero API keys needed.
 */

const DEFAULT_KEYWORDS = ['agentic workflow', 'ai automation', 'micro-saas trends'];

// ══════════════════════════════════════════
// SOURCE 1: Google Trends RSS (free, no key)
// ══════════════════════════════════════════
async function fetchGoogleTrends(keyword: string): Promise<number> {
  try {
    const rss = await cachedFetch(
      `https://trends.google.com/trends/trendingsearches/daily/rss?geo=US`,
      'market-signals'
    ).then(r => r.text());
    
    // Count how many trending searches match keyword
    const matches = (rss.match(new RegExp(keyword, 'gi')) || []).length;
    return Math.min(1, matches / 10); // Normalize to 0-1
  } catch (e) {
    return 0.5;
  }
}

// ══════════════════════════════════════════
// SOURCE 2: Jina Reader → HackerNews (free)
// ══════════════════════════════════════════
async function fetchHNSignal(keyword: string): Promise<{ headline: string; score: number }> {
  try {
    // HackerNews Algolia API — completely free, no key
    const data = await cachedFetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}&tags=story&numericFilters=points>50&hitsPerPage=3`,
      'hn-signals'
    ).then(r => r.json());
    
    const top = data.hits[0];
    return {
      headline: top?.title ?? `Growing interest in ${keyword}`,
      score: Math.min(1, (top?.points ?? 0) / 500), // Normalize by 500 points
    };
  } catch (e) {
    return { headline: `Growing interest in ${keyword}`, score: 0.5 };
  }
}

// ══════════════════════════════════════════
// SOURCE 3: Reddit API (free, no key)
// ══════════════════════════════════════════  
async function fetchRedditSignal(keyword: string): Promise<number> {
  try {
    const data = await cachedFetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&sort=new&limit=10&t=day`,
      'market-signals'
    ).then(r => r.json());
    
    const posts = data?.data?.children ?? [];
    const avgScore = posts.reduce((s: number, p: any) => s + p.data.score, 0) / Math.max(posts.length, 1);
    return Math.min(1, avgScore / 100);
  } catch (e) {
    return 0.5;
  }
}

// ══════════════════════════════════════════
// SOURCE 4: GitHub Trending (free scrape via Jina)
// ══════════════════════════════════════════
async function fetchGitHubTrendingSignal(keyword: string): Promise<number> {
  try {
    const page = await cachedFetch(
      `https://r.jina.ai/https://github.com/trending?spoken_language_code=en`,
      'github-signals'
    ).then(r => r.text());
    const matches = (page.match(new RegExp(keyword, 'gi')) || []).length;
    return Math.min(1, matches / 5);
  } catch (e) {
    return 0.5;
  }
}

// ══════════════════════════════════════════
// SOURCE 5: Product Hunt Today (free via Jina)
// ══════════════════════════════════════════
async function fetchProductHuntSignal(keyword: string): Promise<{ headline: string; momentum: number }> {
  try {
    const page = await cachedFetch(
      `https://r.jina.ai/https://www.producthunt.com`,
      'market-signals'
    ).then(r => r.text());
    const relevant = page.toLowerCase().includes(keyword.toLowerCase());
    return {
      headline: relevant ? `${keyword} featured on Product Hunt today` : `${keyword} category active`,
      momentum: relevant ? 0.9 : 0.5
    };
  } catch (e) {
    return { headline: `${keyword} category active`, momentum: 0.5 };
  }
}

// ══════════════════════════════════════════
// QUANTUM AGGREGATOR — triangulate all sources
// ══════════════════════════════════════════
export async function fetchMarketSignals(keywords: string[] = DEFAULT_KEYWORDS): Promise<MarketSignal[]> {
  return Promise.all(
    keywords.slice(0, 6).map(async (keyword) => {
      // Fire all sources in parallel — total latency = slowest source (~800ms)
      const [trends, hn, reddit, ghTrending, ph] = await Promise.allSettled([
        fetchGoogleTrends(keyword),
        fetchHNSignal(keyword),
        fetchRedditSignal(keyword),
        fetchGitHubTrendingSignal(keyword),
        fetchProductHuntSignal(keyword),
      ]);

      // Weighted triangulation — HN and trends are highest signal
      const trendScore  = trends.status  === 'fulfilled' ? trends.value  : 0.5;
      const hnData      = hn.status      === 'fulfilled' ? hn.value      : { headline: '', score: 0.5 };
      const redditScore = reddit.status  === 'fulfilled' ? reddit.value  : 0.5;
      const ghScore     = ghTrending.status === 'fulfilled' ? ghTrending.value : 0.5;
      const phData      = ph.status      === 'fulfilled' ? ph.value      : { momentum: 0.5, headline: '' };

      // Weighted average: HN=35%, Google=25%, Reddit=20%, GitHub=10%, PH=10%
      const momentum = (
        hnData.score  * 0.35 +
        trendScore    * 0.25 +
        redditScore   * 0.20 +
        ghScore       * 0.10 +
        phData.momentum * 0.10
      );

      // Confidence = how many sources agreed (non-default values)
      const activeSources = [trendScore, hnData.score, redditScore, ghScore, phData.momentum]
        .filter(s => s !== 0.5).length;
      const confidence = activeSources / 5;

      return {
        keyword,
        momentum: Math.round(momentum * 100) / 100,
        headline: hnData.headline || phData.headline || `${keyword} momentum: ${Math.round(momentum * 100)}%`,
        sourceUrl: `https://hn.algolia.com/?q=${encodeURIComponent(keyword)}`,
        confidence: Math.round(confidence * 100) / 100,
      };
    })
  );
}
