import { GitHubSignal } from '@/lib/opportunity/types';

const GITHUB_API = 'https://api.github.com';

export async function fetchGitHubSignals(repo?: string): Promise<GitHubSignal> {
  if (!repo) {
    return {
      issueVelocity: 0.4,
      prVelocity: 0.5,
      openIssues: 0,
      openPRs: 0,
      hotLabels: [],
      confidence: 0.2,
    };
  }

  const [issuesResp, prsResp] = await Promise.all([
    fetch(`${GITHUB_API}/repos/${repo}/issues?state=open&per_page=100`, {
      headers: { Accept: 'application/vnd.github+json' },
      next: { revalidate: 1800 },
    }),
    fetch(`${GITHUB_API}/repos/${repo}/pulls?state=open&per_page=100`, {
      headers: { Accept: 'application/vnd.github+json' },
      next: { revalidate: 1800 },
    }),
  ]);

  if (!issuesResp.ok || !prsResp.ok) {
    return {
      issueVelocity: 0.3,
      prVelocity: 0.3,
      openIssues: 0,
      openPRs: 0,
      hotLabels: [],
      sourceUrl: `https://github.com/${repo}`,
      confidence: 0.25,
    };
  }

  const issues = (await issuesResp.json()) as Array<{ labels?: Array<{ name?: string }>; pull_request?: unknown }>;
  const prs = (await prsResp.json()) as Array<{ created_at?: string }>;

  const pureIssues = issues.filter((issue) => !issue.pull_request);
  const labels = pureIssues.flatMap((issue) => issue.labels?.map((label) => label.name ?? '').filter(Boolean) ?? []);
  const labelCounts = labels.reduce<Record<string, number>>((acc, label) => {
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});

  const hotLabels = Object.entries(labelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label]) => label);

  const issueVelocity = Math.min(1, pureIssues.length / 40);
  const prVelocity = Math.min(1, prs.length / 30);

  return {
    issueVelocity,
    prVelocity,
    openIssues: pureIssues.length,
    openPRs: prs.length,
    hotLabels,
    sourceUrl: `https://github.com/${repo}`,
    confidence: 0.8,
  };
}
