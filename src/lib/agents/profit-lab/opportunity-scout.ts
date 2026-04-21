/**
 * /src/lib/agents/profit-lab/opportunity-scout.ts
 * The Opportunity Scout agent searches for profitable ventures.
 */

import { callOllama } from '@/lib/ollama-client';
import { Opportunity } from '@/types/twin';
import PocketBase from 'pocketbase';

export class OpportunityScout {
  constructor(private pb: PocketBase) {}

  /**
   * Scouts the market for a specific category.
   * This would typically call a search tool or external API.
   */
  async scout(userId: string, category: Opportunity['category'] = 'saas'): Promise<Opportunity[]> {
    console.log(`[OpportunityScout] Scouting for ${category} opportunities...`);

    // In a real scenario, we'd use the search_web tool results here.
    // For the implementation, we'll use a prompt to generate/analyze hypothetical findings 
    // based on "scouted data" (which we can pass from the orchestrator).
    
    const prompt = `
      You are an expert venture capitalist and tech scout. 
      Analyze current trends in ${category} for April 2026.
      Return a JSON array of 3 highly profitable, low-operational-cost opportunities.
      Format: [{"title": string, "description": string, "score": number(0-100), "estimated_roi": string, "speed_to_market": "fast"|"med"|"slow"}]
    `;

    try {
      const response = await callOllama(prompt);
      const rawOpportunities = this.parseJsonArray(response);

      const savedOpportunities: Opportunity[] = [];
      for (const raw of rawOpportunities) {
        const opp = await this.pb.collection('opportunities').create({
          user_id: userId,
          title: raw.title,
          description: raw.description,
          category: category,
          score: raw.score,
          confidence: 0.8,
          estimated_roi: raw.estimated_roi,
          speed_to_market: raw.speed_to_market,
          status: 'scouted',
          source_signals: ['ai_trend_analysis', 'web_scout_sim'],
        }) as Opportunity;
        savedOpportunities.push(opp);
      }

      return savedOpportunities;
    } catch (error) {
      console.error('[OpportunityScout] Scouting failed:', error);
      return [];
    }
  }

  private parseJsonArray(content: string): any[] {
    try {
      const match = content.match(/\[[\s\S]*\]/);
      return JSON.parse(match ? match[0] : '[]');
    } catch {
      return [];
    }
  }
}
