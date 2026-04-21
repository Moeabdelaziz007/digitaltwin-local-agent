import { MarketSignal } from '@/lib/opportunity/types';

const DEFAULT_KEYWORDS = ['agent automation', 'ai workflow', 'customer support ops'];

function scoreKeyword(keyword: string): number {
  const normalized = keyword.toLowerCase();
  if (normalized.includes('compliance') || normalized.includes('security')) return 0.88;
  if (normalized.includes('automation') || normalized.includes('ops')) return 0.8;
  return 0.68;
}

/**
 * Mocks or fetches market signals based on keywords.
 */
export async function fetchMarketSignals(keywords: string[] = DEFAULT_KEYWORDS): Promise<MarketSignal[]> {
  // In a real implementation, this would call a news API or market intelligence service.
  // For now, we use a scoring heuristic based on the provided keywords.
  return keywords.slice(0, 6).map((keyword, index) => ({
    keyword,
    momentum: Math.max(0.45, scoreKeyword(keyword) - index * 0.06),
    headline: `Rising interest around ${keyword}`,
    sourceUrl: `https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}`,
    confidence: 0.55,
  }));
}
