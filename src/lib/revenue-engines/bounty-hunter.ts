/**
 * src/lib/revenue-engines/bounty-hunter.ts
 * محرك "صائد المكافآت" (GitHub Bounty Hunter Engine)
 */

import { WorkflowNode } from '../consensus/dag-executor';

export const BountyHunterBlueprint = {
  name: 'Bounty Hunter',
  mission: 'Find GitHub issues with bounties, solve them using Claude Code, and submit PRs.',
  
  getWorkflow(issueUrl: string): WorkflowNode[] {
    return [
      {
        id: 'analyze_issue',
        agent: 'Architect',
        task: `Analyze the problem in: ${issueUrl} and map the files involved.`,
        dependencies: [],
        parallel: true
      },
      {
        id: 'solve_issue',
        agent: 'claude-code', // تفويض خارجي
        task: 'Implement the fix, write tests, and ensure code style consistency.',
        dependencies: ['analyze_issue'],
        parallel: false
      },
      {
        id: 'verify_fix',
        agent: 'Guardian',
        task: 'Run tests and check for security regressions or privacy leaks.',
        dependencies: ['solve_issue'],
        parallel: false
      },
      {
        id: 'submit_pr',
        agent: 'CEO',
        task: 'Draft the PR description explaining the fix and link it to the bounty.',
        dependencies: ['verify_fix'],
        parallel: false
      }
    ];
  }
};
