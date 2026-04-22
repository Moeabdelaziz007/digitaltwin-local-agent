import { Opportunity } from '@/types/twin';
import { callOllama } from '@/lib/ollama-client';

export class SynapseOracle {
  private name = 'The Oracle';

  /**
   * Monitors emerging signals from Hacker News and other sources.
   * Aims to detect opportunities BEFORE they trend.
   */
  async detectEmergingOpportunities(): Promise<Opportunity[]> {
    console.log(`[${this.name}] Scanning emerging signals...`);
    
    // Simulate fetching from sources like Hacker News or Product Hunt
    const rawSignals = await this.fetchHNSignals();
    
    const prompt = `
      You are Synapse Oracle. Analyze these raw tech signals and identify 3 high-potential micro-SaaS or crypto arbitrage opportunities.
      SIGNALS: ${JSON.stringify(rawSignals)}
      
      Return ONLY a JSON array of Opportunity objects:
      [{ "title": "string", "description": "string", "category": "saas|crypto|arbitrage", "score": 85, "estimated_roi": "string", "required_skills": ["string"] }]
    `;

    try {
      const response = await callOllama(prompt);
      const opportunities = this.parseOpportunities(response);
      console.log(`[${this.name}] Detected ${opportunities.length} potential gems.`);
      return opportunities;
    } catch (error) {
      console.error(`[${this.name}] Detection failed:`, error);
      return [];
    }
  }

  private async fetchHNSignals(): Promise<string[]> {
    // Free tier fallback: simulation of top HN stories
    return [
      "AI-native spreadsheet for local data processing",
      "DePIN network for shared GPU compute on mobile",
      "Open-source alternative to Vercel for edge-only deployments",
      "Cross-chain liquidity bridge for low-cap gems"
    ];
  }

  private parseOpportunities(content: string): Opportunity[] {
    try {
      const match = content.match(/\[[\s\S]*\]/);
      return JSON.parse(match ? match[0] : '[]');
    } catch {
      return [];
    }
  }
}
