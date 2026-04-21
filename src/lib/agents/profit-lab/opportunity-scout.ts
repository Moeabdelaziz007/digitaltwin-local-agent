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
   * This is a "Self-Designing" scout that optimizes its own search parameters.
   */
  async scout(userId: string, category: Opportunity['category'] = 'saas'): Promise<Opportunity[]> {
    console.log(`[OpportunityScout] MAS-ZERO: Designing scouting parameters for ${category}...`);

    // MAS-ZERO logic: First, ask the model to design the BEST scouting query for this category
    const designPrompt = `
      MAS-ZERO Architecture: Meta-Architect Phase.
      Category: ${category}
      Goal: Find "Hidden Gems" (High ROI, Low Liquidity, or Emerging Micro-SaaS niches).
      
      Output a set of scouting criteria and keywords to find 100x opportunities.
      Format: JSON { "criteria": string[], "keywords": string[], "focus": string }
    `;

    try {
      const designResponse = await callOllama(designPrompt);
      const metaConfig = this.parseJson(designResponse);

      console.log(`[OpportunityScout] Scouting with config: ${metaConfig.focus}`);

      const scoutPrompt = `
        You are an Autonomous Venture Scout. 
        Current Market Regime: April 2026.
        Using these Meta-Criteria: ${JSON.stringify(metaConfig.criteria)}
        And these Keywords: ${JSON.stringify(metaConfig.keywords)}
        
        Task: Identify 3 "Hidden Gem" opportunities.
        Analyze:
        1. Market Sentiment (0.0 to 1.0) - How is the mood regarding this niche?
        2. Causal Logic - What trigger (event) leads to this opportunity, and what is the specific outcome?
        
        Return a JSON array of 3 opportunities.
        Format: [{
          "title": string, 
          "description": string, 
          "score": number, 
          "sentiment_score": number,
          "estimated_roi": string, 
          "speed_to_market": "fast"|"med"|"slow", 
          "causal_logic": {
            "trigger": string,
            "bridge": string,
            "outcome": string
          }
        }]
      `;

      const response = await callOllama(scoutPrompt);
      const rawOpportunities = this.parseJsonArray(response);

      const savedOpportunities: Opportunity[] = [];
      for (const raw of rawOpportunities) {
        const opp = await this.pb.collection('opportunities').create({
          user_id: userId,
          title: raw.title,
          description: raw.description,
          category: category,
          score: raw.score,
          sentiment_score: raw.sentiment_score || 0.5,
          confidence: 0.85, 
          estimated_roi: raw.estimated_roi,
          speed_to_market: raw.speed_to_market,
          status: 'scouted',
          source_signals: ['mas_zero_architect', 'sentiment_weighted_scout'],
          causal_graph: {
             nodes: [
               { id: 't1', label: raw.causal_logic?.trigger || 'Market Shift', node_type: 'event' },
               { id: 'd1', label: raw.causal_logic?.bridge || 'Strategic Pivot', node_type: 'decision' },
               { id: 'o1', label: raw.causal_logic?.outcome || 'Profit Realization', node_type: 'profit' }
             ],
             edges: [
               { source: 't1', target: 'd1', relation_type: 'causes', weight: 1.0 },
               { source: 'd1', target: 'o1', relation_type: 'amplifies', weight: 0.8 }
             ]
          }
        }) as Opportunity;
        savedOpportunities.push(opp);
      }

      return savedOpportunities;
    } catch (error) {
      console.error('[OpportunityScout] Scouting failed:', error);
      return [];
    }
  }

  private parseJson(content: string): any {
    try {
      const match = content.match(/\{[\s\S]*\}/);
      return JSON.parse(match ? match[0] : '{}');
    } catch {
      return {};
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

