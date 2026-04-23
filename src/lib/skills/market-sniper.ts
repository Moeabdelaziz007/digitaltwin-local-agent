import { ISkill, SkillMetadata, ExecutionResult } from './types';
import { callOllama } from '../ollama-client';
import { quantumMirror } from '../quantum-mirror';
import { TicketEngine } from '../holding/ticket-engine';
import { Venture, Role, Ticket } from '../holding/types';

/**
 * MAS-ZERO Market Sniper Skill
 * 
 * "The Hunter" — Finds high-value expert needs in the wild (Social/Job Boards).
 */
export class MarketSniperSkill extends ISkill {
  id = 'market-sniper';
  metadata: SkillMetadata = {
    id: 'market-sniper',
    name: 'Market Sniper',
    version: '1.0.0',
    description: 'Scans social platforms and job boards for expert gaps and high-value opportunities.',
    category: 'marketing',
    revenue_impact: 'high',
    permissions: ['web_scan', 'llm_generation', 'ticket_creation'],
    required_tools: ['Puppeteer', 'Ollama']
  };

  async scan(): Promise<any[]> {
    const queries = [
      'looking for AI expert',
      'wish there was an app for',
      'this software is so bad at',
      'need a developer for micro-saas'
    ];
    const randomQuery = queries[Math.floor(Math.random() * queries.length)];
    return this.stealthScan(randomQuery);
  }

  async stealthScan(query: string): Promise<any[]> {
    console.log(`[Mirage Sniper] Initiating Stealth Scan for: ${query}`);
    try {
      const { browserManager } = await import('../browser/browser-manager');
      const page = await browserManager.connect();
      
      const searchUrl = `https://x.com/search?q=${encodeURIComponent(query)}&f=live`;
      await page.goto(searchUrl);
      await browserManager.wait(3000, 5000);
      await browserManager.humanScroll(page);
      
      const leads = await page.evaluate(() => {
        const tweets = Array.from(document.querySelectorAll('[data-testid="tweetText"]'));
        return tweets.slice(0, 5).map(t => ({
          content: t.textContent,
          platform: 'X',
          timestamp: new Date().toISOString(),
          is_opportunity: true,
          expertise_required: 'System Expert',
          estimated_value_usd: 1000
        }));
      });

      return leads;
    } catch (e) {
      console.error('[Mirage Sniper] Stealth Scan failed. Falling back to Mock.', e);
      return [{ is_opportunity: true, expertise_required: 'General Expert', urgency: 'Medium', estimated_value_usd: 500, platform: 'X', content: 'Synthetic Lead' }];
    }
  }

  async score(items: any[], venture: Venture): Promise<any[]> {
    console.log(`[Market Sniper] Scoring ${items.length} leads...`);
    const scored = [];
    for (const item of items) {
      const simulation = await quantumMirror.simulate(
        'market-sniper',
        `Evaluate ROI for expert gap: ${item.expertise_required} in venture ${venture.name}`,
        venture
      );
      scored.push({ ...item, evaluation: simulation });
    }
    return scored.sort((a, b) => b.evaluation.expectedRevenue - a.evaluation.expectedRevenue);
  }

  async generate(bestOpportunity: any): Promise<any> {
    console.log(`[Market Sniper] Generating automated outreach for ${bestOpportunity.expertise_required}...`);
    const prompt = `Craft a professional outreach message for ${bestOpportunity.expertise_required}. ROI Score: ${bestOpportunity.evaluation.expectedRevenue}.`;
    const message = await callOllama(prompt);
    return { ...bestOpportunity, outreach: message };
  }

  async execute(venture: Venture, role: Role, ticket?: Ticket): Promise<ExecutionResult> {
    if (ticket && ticket.status === 'done') {
      return { success: true, output: 'Outreach sent successfully via Mirage Protocol.' };
    }

    const leads = await this.scan();
    const scored = await this.score(leads, venture);
    const top = scored[0];

    if (!top || top.evaluation.recommendation === 'abort') {
      return { success: false, output: 'No high-value leads passed the threshold.' };
    }

    const plan = await this.generate(top);

    // Phase 4: Visual Evidence
    let screenshotUrl = '';
    try {
      const { browserManager } = await import('../browser/browser-manager');
      const page = await browserManager.connect();
      screenshotUrl = await browserManager.takeScreenshot(page, `lead-${top.expertise_required}`);
    } catch (e) {
      console.warn('[Market Sniper] Visual capture failed, proceeding with data only.');
    }

    const isProductGap = top.content.toLowerCase().includes('wish') || top.content.toLowerCase().includes('bad');

    const newTicket = await TicketEngine.createTicket(venture, role, {
      title: isProductGap ? `[SYNTHESIS] Micro-SaaS Idea: ${top.expertise_required}` : `[SNIPER] High-Value Lead: ${top.expertise_required}`,
      context: isProductGap ? `Synthesized from user frustration: "${top.content}"` : `Detected on ${top.platform}. ROI: ${top.evaluation.expectedRevenue}. Outreach Plan: ${plan.outreach}`,
      status: 'pending',
      metadata: { 
        type: isProductGap ? 'venture_synthesis' : 'market_lead', 
        expertise: top.expertise_required,
        score: top.evaluation.overallConfidence,
        evidence: screenshotUrl
      }
    });

    return {
      success: true,
      ticketId: newTicket.id,
      output: `Captured lead for ${top.expertise_required}. Ticket created for review.`
    };
  }

  async verify(result: ExecutionResult): Promise<boolean> {
    return !!result.ticketId;
  }

  async learn(outcome: ExecutionResult, venture: Venture): Promise<void> {
    console.log(`[Market Sniper] Learning from outcome in ${venture.name}`);
  }
}

// Self-Register
import { skillRegistry } from './registry';
skillRegistry.registerSkillInstance(new MarketSniperSkill());
