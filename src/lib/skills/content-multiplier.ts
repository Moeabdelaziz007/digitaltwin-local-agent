import { callOllama } from '../ollama-client';
import { skillRegistry } from './registry';
import { ExecutionResult } from './types';
import { TicketEngine } from '../holding/ticket-engine';
import { Venture, Role } from '../holding/types';

/**
 * src/lib/skills/content-multiplier.ts
 * Content Multiplier Engine: Automated SEO & Social Domination
 */

export class ContentMultiplierSkill {
  static id = 'content-multiplier';

  async scan(): Promise<any[]> {
    console.log('[ContentMultiplier][Hunter] Scouting for trending topics and affiliate opportunities...');
    const topics = await this.discoverTrends();
    
    if (topics.length === 0) return [];

    const { ventureRegistry } = await import('../holding/venture-registry');
    const ventures = ventureRegistry.listVentures();
    const mainVenture = ventures[0];
    
    if (!mainVenture) return topics;

    for (const topic of topics) {
      await TicketEngine.createTicket(mainVenture, mainVenture.org_chart[0], {
        title: `[PROFIT OPPORTUNITY] Trending Content: ${topic.title}`,
        context: `
          **Opportunity Detected**
          **Topic:** ${topic.title}
          **Sentiment:** ${topic.sentiment}
          
          Analysis needed to generate SEO content and social threads.
        `,
        priority: 'medium',
        metadata: { type: 'content_publication', topic }
      });
    }

    return topics;
  }

  async execute(venture: Venture, role: Role): Promise<ExecutionResult> {
    console.log('[ContentMultiplier] Scanning for trending topics...');

    // 1. Discover Trends
    const topics = await this.discoverTrends();
    const topTopic = topics[0];

    if (!topTopic) {
      return { success: false, output: 'no_trending_topics_found' };
    }

    // 2. Generate Content
    const article = await this.generateArticle(topTopic);
    const socialPosts = await this.generateSocialPosts(article);
    
    // 3. Submit for Approval (Governance Layer)
    const ticket = await TicketEngine.createTicket(venture, role, {
      title: `[CONTENT] Publish Article: ${topTopic.title}`,
      context: `
        **Topic:** ${topTopic.title}
        **Sentiment:** ${topTopic.sentiment}
        
        **Draft Article Snippet:**
        ${article.substring(0, 500)}...
        
        **Social Posts:**
        - X: ${socialPosts.x}
        - LinkedIn: ${socialPosts.linkedin}
      `,
      priority: 'medium',
      metadata: {
        type: 'content_publication',
        topic: topTopic
      }
    });

    return { 
      success: true, 
      output: `Content drafted for ${topTopic.title}. Awaiting approval.`,
      ticketId: ticket.id 
    };
  }

  private async discoverTrends() {
    return [
      { id: 't1', title: 'The Rise of Local-First AI', sentiment: 'positive' },
      { id: 't2', title: 'Why TypeScript 5.8 is a Game Changer', sentiment: 'high-interest' }
    ];
  }

  private async generateArticle(topic: any) {
    const prompt = `Write a high-quality SEO article about: ${topic.title}. Include headers, a conclusion, and 5 keywords.`;
    return await callOllama(prompt, [
      { role: 'system', content: 'You are a professional SEO Content Strategist.' }
    ]);
  }

  private async generateSocialPosts(article: string) {
    const prompt = `Create a viral X thread and a professional LinkedIn post based on this article: ${article.substring(0, 1000)}`;
    const result = await callOllama(prompt, [
      { role: 'system', content: 'You are a Social Media Growth Expert.' }
    ]);
    
    return {
      x: result.split('---')[0] || result,
      linkedin: result.split('---')[1] || result
    };
  }
}

// Register in AHP Registry
skillRegistry.registerSkill({
  id: ContentMultiplierSkill.id,
  metadata: {
    name: 'Content Multiplier',
    version: '1.2.0',
    description: 'Automates SEO article creation and social media distribution.',
    when_to_use: 'When building organic traffic and authority for ventures.',
    permissions: ['network', 'social_api_write'],
    required_tools: ['ollama', 'jina-reader'],
    category: 'revenue',
    revenue_impact: 'medium'
  },
  instructions: 'Find trends, generate high-quality content, and prep social distribution for approval.'
});
