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
        Using these Meta-Criteria: ${JSON.stringify(metaConfig.criteria)}
        And these Keywords: ${JSON.stringify(metaConfig.keywords)}
        
        Analyze the current market landscape for April 2026.
        Return a JSON array of 3 "Hidden Gem" opportunities.
        Include 'causal_trigger' field explaining WHY this is a gem now.
        
        Format: [{"title": string, "description": string, "score": number, "estimated_roi": string, "speed_to_market": "fast"|"med"|"slow", "causal_trigger": string}]
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
          confidence: 0.85, // Higher confidence for MAS-ZERO designs
          estimated_roi: raw.estimated_roi,
          speed_to_market: raw.speed_to_market,
          status: 'scouted',
          source_signals: ['mas_zero_architect', 'causal_trigger_analysis'],
          causal_graph: {
             nodes: [
               { id: '1', label: raw.causal_trigger, type: 'trigger' },
               { id: '2', label: raw.title, type: 'opportunity' },
               { id: '3', label: 'Profit', type: 'outcome' }
             ],
             edges: [
               { from: '1', to: '2', relationship: 'enables' },
               { from: '2', to: '3', relationship: 'leads_to' }
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

