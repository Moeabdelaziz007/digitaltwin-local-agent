import { callOllama } from '../ollama-client';
import { skillRegistry } from './registry';
import { ExecutionResult } from './types';
import { TicketEngine } from '../holding/ticket-engine';
import { Venture, Role } from '../holding/types';

/**
 * src/lib/skills/freelance-arbitrage.ts
 * Freelance Arbitrage Engine: Automated Opportunity Scouting & Bidding
 */

export class FreelanceArbitrageSkill {
  static id = 'freelance-arbitrage';

  async scan(): Promise<any[]> {
    console.log('[FreelanceArbitrage][Hunter] Searching for high-value freelance jobs...');
    const jobs = await this.scanUpwork({ minBudget: 1000 });
    
    if (jobs.length === 0) return [];

    const { ventureRegistry } = await import('../holding/venture-registry');
    const ventures = ventureRegistry.listVentures();
    const mainVenture = ventures[0];
    
    if (!mainVenture) return jobs;

    for (const job of jobs) {
      await TicketEngine.createTicket(mainVenture, mainVenture.org_chart[0], {
        title: `[PROFIT OPPORTUNITY] Freelance Job: ${job.title}`,
        context: `
          **Opportunity Detected**
          **Title:** ${job.title}
          **Budget:** $${job.budget}
          **Description:** ${job.description}
          
          Analysis needed to draft a winning proposal.
        `,
        priority: 'high',
        metadata: { type: 'freelance_bid', opportunity: job }
      });
    }

    return jobs;
  }

  async execute(venture: Venture, role: Role): Promise<ExecutionResult> {
    console.log('[FreelanceArbitrage] Starting execution loop...');

    // 1. Scan (Simulated Upwork/Contra Scan)
    const jobs = await this.scanUpwork({ minBudget: 500, skills: ['nextjs', 'ai'] });
    
    // 2. Score
    const scored = await this.scoreOpportunities(jobs);
    const topOpportunity = scored[0];

    if (!topOpportunity || topOpportunity.score < 0.7) {
      return { success: false, output: 'no_high_value_opportunities' };
    }

    // 3. Draft Proposal
    const proposal = await this.generateProposal(topOpportunity);
    
    // 4. Submit for Approval (Governance Layer)
    const ticket = await TicketEngine.createTicket(venture, role, {
      title: `[BID] ${topOpportunity.title} - $${topOpportunity.budget}`,
      context: `
        **Opportunity Found:** ${topOpportunity.title}
        **Budget:** $${topOpportunity.budget}
        **Score:** ${(topOpportunity.score * 100).toFixed(0)}%
        
        **Drafted Proposal:**
        ${proposal}
      `,
      priority: 'high',
      metadata: {
        type: 'freelance_bid',
        opportunity: topOpportunity
      }
    });

    console.log(`[FreelanceArbitrage] Proposal submitted for approval. Ticket ID: ${ticket.id}`);

    return { 
      success: true, 
      output: `Proposal submitted for ${topOpportunity.title}`,
      ticketId: ticket.id 
    };
  }

  private async scanUpwork(criteria: any) {
    // Simulated scan - In production, this uses Puppeteer/Jina Reader
    return [
      { id: 'job-1', title: 'Next.js AI Dashboard', budget: 1200, description: 'Need a dashboard with AI integration.' },
      { id: 'job-2', title: 'Simple Landing Page', budget: 150, description: 'Basic HTML/CSS.' }
    ];
  }

  private async scoreOpportunities(jobs: any[]) {
    return jobs.map(job => ({
      ...job,
      score: job.budget > 1000 ? 0.9 : 0.4
    })).sort((a, b) => b.score - a.score);
  }

  private async generateProposal(job: any) {
    const prompt = `Write a winning freelance proposal for: ${job.title}. Budget: ${job.budget}. Description: ${job.description}`;
    return await callOllama(prompt, [
      { role: 'system', content: 'You are a top-rated freelancer specializing in AI and Next.js.' }
    ]);
  }
}

// Register in AHP Registry
skillRegistry.registerSkill({
  id: FreelanceArbitrageSkill.id,
  metadata: {
    name: 'Freelance Arbitrage Sniper',
    version: '1.2.0',
    description: 'Scans platforms for high-value jobs and drafts winning proposals.',
    when_to_use: 'When looking for external revenue from freelance platforms.',
    permissions: ['network', 'browser'],
    required_tools: ['jina-reader', 'ollama'],
    category: 'revenue',
    revenue_impact: 'medium'
  },
  instructions: 'Identify, score, and draft proposals for high-ticket freelance jobs.'
});
