import { env } from '@/lib/env';

/**
 * src/lib/opportunity/connectors/github-bounties.ts
 * Scans GitHub for open issues with bounties.
 */

export interface BountyIssue {
  id: number;
  repo: string;
  reward: string;
  description: string;
  url: string;
}

export async function fetchBountyIssues(): Promise<BountyIssue[]> {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    console.warn('[GitHubBounty] GITHUB_TOKEN missing, skipping scan.');
    return [];
  }

  const query = 'label:bounty+state:open+language:typescript';
  const url = `https://api.github.com/search/issues?q=${query}&sort=created`;

  try {
    const response = await fetch(url, {
      headers: { 
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) throw new Error(`GitHub API failed: ${response.statusText}`);
    
    const data = await response.json();
    return (data.items || [])
      .filter((i: any) => i.body && i.body.length < 5000) // Realistic scope
      .map((i: any) => ({
        id: i.number,
        repo: i.repository_url,
        reward: extractBountyAmount(i.body),
        description: i.body,
        url: i.html_url
      }));
  } catch (error) {
    console.error('[GitHubBounty] Error fetching bounties:', error);
    return [];
  }
}

function extractBountyAmount(body: string): string {
  const match = body.match(/\$(\d+)/);
  return match ? `$${match[1]}` : 'TBD';
}
