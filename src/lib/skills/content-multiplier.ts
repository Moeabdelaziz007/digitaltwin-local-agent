import { ISkill, ExecutionResult, SkillMetadata } from './types';
import { TicketEngine } from '../holding/ticket-engine';
import { Venture, Role, Ticket } from '../holding/types';
import { callOllama } from '../ollama-client';

/**
 * src/lib/skills/content-multiplier.ts
 * Content Multiplier Engine: Automated SEO & Social Domination
 */

const AFFILIATE_DATABASE = [
  { name: 'Vercel', link: 'https://vercel.com?via=twin', category: 'deployment' },
  { name: 'GitHub Copilot', link: 'https://github.com/features/copilot', category: 'ai-coding' },
  { name: 'Notion', link: 'https://notion.so?via=twin', category: 'productivity' }
];

export class ContentMultiplierSkill extends ISkill {
  id = 'content-multiplier';
  metadata: SkillMetadata = {
    id: 'content-multiplier',
    name: 'Content Multiplier',
    version: '2.0.0',
    description: 'Automates SEO article creation and social media distribution with embedded affiliate monetization.',
    category: 'marketing',
    revenue_impact: 'medium',
    permissions: ['network', 'social_api_write'],
    required_tools: ['ollama', 'jina-reader']
  };

  async scan(): Promise<any[]> {
    console.log('[ContentMultiplier][Hunter] Scouting for trending topics and affiliate opportunities...');
    return [
      { id: 't1', title: 'The Rise of Local-First AI', sentiment: 'positive', keyword: 'ai' },
      { id: 't2', title: 'Why TypeScript 5.8 is a Game Changer', sentiment: 'high-interest', keyword: 'coding' }
    ];
  }

  async score(items: any[], venture: Venture): Promise<any[]> {
    return items.map(item => {
      const matches = AFFILIATE_DATABASE.filter(p => item.keyword?.includes(p.category) || item.title.toLowerCase().includes(p.category));
      return {
        ...item,
        score: matches.length > 0 ? 0.95 : 0.75,
        affiliates: matches
      };
    }).sort((a, b) => b.score - a.score);
  }

  async generate(bestOpportunity: any): Promise<any> {
    const affiliateContext = bestOpportunity.affiliates?.length > 0 
      ? `Include subtle mentions of: ${bestOpportunity.affiliates.map((a: any) => a.name).join(', ')}.`
      : '';
      
    const prompt = `Write a high-quality SEO article about: ${bestOpportunity.title}. ${affiliateContext} Include headers, a conclusion, and 5 keywords.`;
    const article = await callOllama(prompt, [
      { role: 'system', content: 'You are a professional SEO Content Strategist.' }
    ]);
    
    const socialPrompt = `Create a viral X thread and a professional LinkedIn post based on this article: ${article.substring(0, 1000)}`;
    const socialResult = await callOllama(socialPrompt, [
      { role: 'system', content: 'You are a Social Media Growth Expert.' }
    ]);

    return { 
      ...bestOpportunity, 
      article, 
      socialPosts: {
        x: socialResult.split('---')[0] || socialResult,
        linkedin: socialResult.split('---')[1] || socialResult
      }
    };
  }

  async execute(venture: Venture, role: Role, ticket?: Ticket): Promise<ExecutionResult> {
    if (ticket && ticket.status === 'done') {
      return { success: true, output: 'Content published successfully via Mirage Social Bridge.' };
    }

    const topics = await this.scan();
    const scored = await this.score(topics, venture);
    const top = scored[0];

    if (!top) return { success: false, output: 'no_trending_topics_found' };

    const plan = await this.generate(top);

    const newTicket = await TicketEngine.createTicket(venture, role, {
      title: `[CONTENT] Publish Article: ${top.title}`,
      context: `
### Topic: ${top.title}
### Sentiment: ${top.sentiment}

### Draft Snippet
${plan.article.substring(0, 300)}...

### Social Plan
- X: ${plan.socialPosts.x.substring(0, 100)}...
- LinkedIn: ${plan.socialPosts.linkedin.substring(0, 100)}...
      `,
      status: 'pending',
      metadata: { type: 'content_publication', topic: top, plan }
    });

    return { 
      success: true, 
      output: `Content drafted for ${top.title}. Awaiting approval.`,
      ticketId: newTicket.id 
    };
  }

  async verify(result: ExecutionResult): Promise<boolean> {
    return result.success;
  }

  async learn(outcome: ExecutionResult, venture: Venture): Promise<void> {
    // Analytics feedback loop
  }
}

// Self-Register
import { skillRegistry } from './registry';
skillRegistry.registerSkillInstance(new ContentMultiplierSkill());
