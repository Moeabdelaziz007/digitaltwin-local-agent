import { callOllama } from '../ollama-client';
import { AgentSkill } from '../agents/profit-lab/skill-registry';
import { AttributionEngine } from '../causal/attribution';

/**
 * src/lib/skills/content-publisher.ts
 * Content Arbitrage Machine: Monitors trends, writes SEO articles, and embeds affiliate links.
 */

export interface MarketSignal {
  keyword: string;
  headline: string;
  momentum: number;
  relatedKeywords: string[];
}

export interface AffiliateProduct {
  name: string;
  link: string;
  category: string;
}

// Known high-paying affiliate programs
const AFFILIATE_DATABASE: AffiliateProduct[] = [
  { name: 'Vercel', link: 'https://vercel.com?via=twin', category: 'deployment' },
  { name: 'GitHub Copilot', link: 'https://github.com/features/copilot', category: 'ai-coding' },
  { name: 'DigitalOcean', link: 'https://m.do.co/c/twin', category: 'cloud' },
  { name: 'Notion', link: 'https://notion.so?via=twin', category: 'productivity' },
  { name: 'Lemon Squeezy', link: 'https://lemonsqueezy.com?aff=twin', category: 'payments' }
];

export const contentArbitrageSkill: AgentSkill & { execute: (context: any) => Promise<any> } = {
  id: 'content-arbitrage@1.0.0',
  name: 'Content Arbitrage Machine',
  version: '1.0.0',
  author: 'system',
  description: 'Monitors trending topics and auto-publishes monetized technical content.',
  successRate: 0,
  totalEarnings: 0,
  lastUsed: new Date().toISOString(),
  status: 'experimental',
  tags: ['revenue', 'content', 'affiliate', 'seo'],
  requiredEnvVars: ['MEDIUM_API_KEY', 'HASHNODE_TOKEN', 'DEVTO_API_KEY'],
  cost: 'free',
  stats: {
    totalRuns: 0,
    avgDurationMs: 0
  },
  execute: async (context: any) => {
    const signal = context as MarketSignal;
    const causal = AttributionEngine.getInstance();

    // 1. Find relevant affiliate products
    const matches = AFFILIATE_DATABASE.filter(p => 
      signal.keyword.toLowerCase().includes(p.category) || 
      signal.headline.toLowerCase().includes(p.category)
    );

    if (matches.length === 0) {
      console.log(`[ContentArbitrage] Skipping non-monetizable topic: ${signal.keyword}`);
      return { status: 'skipped', reason: 'no_affiliate_match' };
    }

    // 2. Generate SEO Article
    const prompt = `
      Write a 1200-word expert technical article about: ${signal.keyword}
      Context: ${signal.headline}
      SEO Keywords: ${signal.relatedKeywords.join(', ')}
      
      INSTRUCTIONS:
      - Naturally mention these tools with their links: ${matches.map(m => `${m.name} (${m.link})`).join(', ')}
      - Tone: Senior Engineer, authoritative but accessible.
      - Include clear code examples or architecture diagrams (mermaid syntax).
      - Use H1, H2, H3 headers for SEO.
    `;

    console.log(`[ContentArbitrage] Writing article for: ${signal.keyword}`);
    const article = await callOllama(prompt, [
      { role: 'system', content: 'You are a world-class technical content creator and SEO specialist.' }
    ]);

    // 3. Auto-post (Simulated for now)
    console.log(`[ContentArbitrage] Article generated (${article.length} chars). Ready for multi-platform blast.`);
    
    // 4. Track in Causal Module
    await causal.recordTrace({
      event: 'content_published',
      causes: ['trending_topic', 'affiliate_match'],
      counterfactual: 'If we had not used affiliate links, revenue potential would be 0.',
      confidence: 0.9
    });

    return {
      status: 'published_simulated',
      topic: signal.keyword,
      products: matches.map(m => m.name),
      timestamp: Date.now()
    };
  }
};
