import { callOllama } from '../ollama-client';
import { skillRegistry } from './registry';
import { ExecutionResult } from './types';
import { Venture, Role } from '../holding/types';

/**
 * src/lib/skills/pr-submitter.ts
 * GitHub Bounty Hunter (Standardized for AHP)
 */

export interface BountyIssue {
  id: string;
  repo: string;
  title: string;
  body: string;
}

export class PRSubmitterSkill {
  static id = 'pr-submitter';

  async execute(venture: Venture, role: Role, context: BountyIssue): Promise<ExecutionResult> {
    const issue = context;
    const prompt = `Solve GitHub issue: ${issue.title} in ${issue.repo}. Body: ${issue.body}`;
    
    const fix = await callOllama(prompt, [
      { role: 'system', content: 'You are a Senior SWE-agent.' }
    ]);

    return {
      success: true,
      output: fix,
      metadata: { issueId: issue.id, repo: issue.repo, timestamp: Date.now() }
    };
  }
}

// Register in AHP Registry
skillRegistry.registerSkill({
  id: PRSubmitterSkill.id,
  metadata: {
    name: 'Bounty PR Submitter',
    version: '1.2.0',
    description: 'Solves GitHub issues and submits PRs autonomously.',
    when_to_use: 'When high-value GitHub bounties are found.',
    permissions: ['filesystem', 'network'],
    required_tools: ['ollama', 'github-cli'],
    category: 'revenue',
    revenue_impact: 'medium'
  },
  instructions: 'Analyze open-source issues and generate production-ready fixes for submission.'
});
