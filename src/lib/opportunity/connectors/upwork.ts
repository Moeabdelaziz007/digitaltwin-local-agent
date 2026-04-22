/**
 * src/lib/opportunity/connectors/upwork.ts
 * Upwork Signal Fetcher using Jina Reader (Zero Cost).
 */

export interface UpworkJob {
  id: string;
  title: string;
  description: string;
  budget: string;
  recency: string;
  url: string;
}

export async function fetchUpworkSignals(skills: string[]): Promise<UpworkJob[]> {
  const query = skills.join('+');
  const upworkUrl = `https://www.upwork.com/nx/search/jobs/?q=${query}&sort=recency`;
  const jinaUrl = `https://r.jina.ai/${upworkUrl}`;

  try {
    console.log(`[UpworkConnector] Fetching signals via Jina: ${jinaUrl}`);
    const response = await fetch(jinaUrl);
    if (!response.ok) throw new Error(`Jina fetch failed: ${response.statusText}`);
    
    const markdown = await response.text();
    return parseUpworkMarkdown(markdown);
  } catch (error) {
    console.error('[UpworkConnector] Error fetching Upwork signals:', error);
    return [];
  }
}

/**
 * Naive markdown parser for Upwork search results (refracted via Jina).
 */
function parseUpworkMarkdown(markdown: string): UpworkJob[] {
  const jobs: UpworkJob[] = [];
  
  // Basic regex to find job-like patterns in markdown
  // Note: In production, this would be more robust or LLM-assisted.
  const jobBlocks = markdown.split('###').slice(1); // Assume jobs start with H3

  for (const block of jobBlocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    const title = lines[0].replace(/\[|\]/g, '');
    const description = lines.find(l => l.length > 50) || '';
    const budget = block.match(/\$\d+(,\d+)?/)?.[0] || 'TBD';
    
    // Create a deterministic ID from title and content
    const id = Buffer.from(title).toString('base64').substring(0, 12);

    jobs.push({
      id,
      title,
      description,
      budget,
      recency: 'Recent',
      url: `https://www.upwork.com/jobs/~${id}` // Simulated URL
    });
  }

  return jobs.slice(0, 5); // Return top 5
}
