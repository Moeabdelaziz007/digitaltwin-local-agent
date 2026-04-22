import { callOllama } from '../ollama-client';
import { skillRegistry } from './registry';
import { BountyIssue, ExecutionResult } from '@/types/agent-skills';

/**
 * src/lib/skills/pr-submitter.ts
 * GitHub Bounty Hunter (Refactored for AHP)
 */

export const prSubmitterSkill = {
  id: 'pr-submitter',
  instructions: `
    You are a Senior SWE-agent. 
    Solve complex open-source bugs and submit production-ready Pull Requests.
  `,
  async execute(context: BountyIssue): Promise<ExecutionResult> {
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
};

// Register in AHP Registry
skillRegistry.registerSkill({
  id: prSubmitterSkill.id,
  metadata: {
    name: 'Bounty PR Submitter',
    version: '1.1.0',
    description: 'Solves GitHub issues and submits PRs autonomously.',
    when_to_use: 'When high-value GitHub bounties are found.',
    permissions: ['filesystem', 'network'],
    required_tools: ['ollama', 'github-cli'],
    category: 'revenue',
    revenue_impact: 'high'
  },
  instructions: prSubmitterSkill.instructions
});
