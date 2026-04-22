import { callOllama } from '../ollama-client';
import { skillRegistry } from './registry';
import { ExecutionResult } from '@/types/agent-skills';

/**
 * src/lib/skills/content-publisher.ts
 * Content Arbitrage Machine (Refactored for AHP)
 */

export interface MarketSignalLocal {
  keyword: string;
  headline: string;
  momentum: number;
  relatedKeywords: string[];
}

const AFFILIATE_DATABASE = [
  { name: 'Vercel', link: 'https://vercel.com?via=twin', category: 'deployment' },
  { name: 'GitHub Copilot', link: 'https://github.com/features/copilot', category: 'ai-coding' },
  { name: 'Notion', link: 'https://notion.so?via=twin', category: 'productivity' }
];

export const contentArbitrageSkill = {
  id: 'content-arbitrage',
  instructions: `
    You are a technical SEO content creator.
    Generate long-form articles with embedded affiliate links.
    Focus on high-value technical niches.
  `,
  async execute(context: MarketSignalLocal): Promise<ExecutionResult> {
    const signal = context;
    const matches = AFFILIATE_DATABASE.filter(p => 
      signal.keyword.toLowerCase().includes(p.category) || 
      signal.headline.toLowerCase().includes(p.category)
    );

    if (matches.length === 0) return { success: false, error: 'no_affiliate_match' };

    const prompt = `Write SEO Article for: ${signal.keyword}. Products: ${matches.map(m => m.name).join(', ')}`;
    const article = await callOllama(prompt, [
      { role: 'system', content: 'You are a technical SEO expert.' }
    ]);

    return {
      success: true,
      output: article,
      metadata: { topic: signal.keyword, timestamp: Date.now() }
    };
  }
};

// Register in AHP Registry
skillRegistry.registerSkill({
  id: contentArbitrageSkill.id,
  metadata: {
    name: 'Content Arbitrage Machine',
    version: '1.1.0',
    description: 'Monitors trends and auto-publishes SEO content.',
    when_to_use: 'When viral tech topics are detected.',
    permissions: ['network'],
    required_tools: ['ollama'],
    category: 'revenue',
    revenue_impact: 'medium'
  },
  instructions: contentArbitrageSkill.instructions
});
