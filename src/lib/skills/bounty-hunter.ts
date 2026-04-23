import { callOllama } from '../ollama-client';
import { skillRegistry } from './registry';
import { ExecutionResult } from './types';
import { TicketEngine } from '../holding/ticket-engine';
import { Venture, Role } from '../holding/types';

/**
 * src/lib/skills/bounty-hunter.ts
 * GitHub Bounty Hunter Engine: Automated Issue Solving for Revenue
 */

export class BountyHunterSkill {
  static id = 'bounty-hunter';

  async scan(): Promise<any[]> {
    console.log('[BountyHunter][Hunter] Scanning for real-world profit opportunities...');
    const issues = await this.scanBounties();
    
    if (issues.length === 0) return [];

    // Create tickets for each opportunity found
    const { ventureRegistry } = await import('../holding/venture-registry');
    const ventures = ventureRegistry.listVentures();
    const mainVenture = ventures[0];
    
    if (!mainVenture) return issues;

    for (const issue of issues) {
      await TicketEngine.createTicket(mainVenture, mainVenture.org_chart[0], {
        title: `[PROFIT OPPORTUNITY] GitHub Bounty: ${issue.repo} #${issue.id}`,
        context: `
          **Opportunity Detected**
          **Repository:** ${issue.repo}
          **Issue:** ${issue.title}
          **Link:** ${issue.url}
          
          Analysis needed to confirm if we can solve this autonomously.
        `,
        priority: 'high',
        metadata: { type: 'github_bounty', issue }
      });
    }

    return issues;
  }

  async execute(venture: Venture, role: Role): Promise<ExecutionResult> {
    console.log('[BountyHunter] Scanning for high-value GitHub issues...');

    // 1. Scan (Simulated search for issues with 'bounty' label)
    const issues = await this.scanBounties();
    
    // 2. Analyze & Pick
    const bestIssue = issues[0];

    if (!bestIssue) {
      return { success: false, output: 'no_bounties_found' };
    }

    // 3. Solve (Draft Fix)
    const solution = await this.generateSolution(bestIssue);
    
    // 4. Submit for Approval (Governance Layer)
    const ticket = await TicketEngine.createTicket(venture, role, {
      title: `[BOUNTY] Fix Issue #${bestIssue.id} in ${bestIssue.repo}`,
      context: `
        **Repository:** ${bestIssue.repo}
        **Issue:** ${bestIssue.title}
        **Potential Reward:** $${bestIssue.reward}
        
        **Drafted Solution:**
        ${solution}
      `,
      priority: 'high',
      metadata: {
        type: 'github_bounty',
        issue: bestIssue
      }
    });

    return { 
      success: true, 
      output: `Solution drafted for ${bestIssue.repo} #${bestIssue.id}`,
      ticketId: ticket.id 
    };
  }

  private async scanBounties() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.warn('[BountyHunter] GITHUB_TOKEN not found. Falling back to simulated scan.');
      return [
        { id: '102', repo: 'facebook/react', title: 'Fix bug in hydration', reward: 500 },
        { id: '445', repo: 'vercel/next.js', title: 'Optimize image loading', reward: 300 }
      ];
    }

    try {
      const query = encodeURIComponent('label:bounty label:bug language:typescript is:open');
      const response = await fetch(`https://api.github.com/search/issues?q=${query}&sort=updated&order=desc`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'MAS-ZERO-Hunter'
        }
      });

      if (!response.ok) throw new Error(`GitHub API error: ${response.statusText}`);
      const data = await response.json();

      return data.items.slice(0, 5).map((item: any) => ({
        id: item.number.toString(),
        repo: item.repository_url.split('/').slice(-2).join('/'),
        title: item.title,
        reward: 'TBD', // Bounties usually specified in comments or external links
        url: item.html_url
      }));
    } catch (e) {
      console.error('[BountyHunter] Real scan failed:', e);
      return [];
    }
  }

  private async generateSolution(issue: any) {
    const prompt = `Solve this GitHub issue for a bounty: ${issue.title} in ${issue.repo}. Provide a clean code fix.`;
    return await callOllama(prompt, [
      { role: 'system', content: 'You are a Senior Software Engineer specializing in open-source contributions.' }
    ]);
  }
}

// Register in AHP Registry
skillRegistry.registerSkill({
  id: BountyHunterSkill.id,
  metadata: {
    name: 'GitHub Bounty Hunter',
    version: '1.2.0',
    description: 'Autonomous agent that finds, analyzes, and solves GitHub issues for bounties.',
    when_to_use: 'When looking to monetize coding skills through open-source bounties.',
    permissions: ['network', 'github_api'],
    required_tools: ['ollama', 'github-cli'],
    category: 'revenue',
    revenue_impact: 'medium'
  },
  instructions: 'Find high-value GitHub issues, analyze the codebase, and draft Pull Requests for approval.'
});
