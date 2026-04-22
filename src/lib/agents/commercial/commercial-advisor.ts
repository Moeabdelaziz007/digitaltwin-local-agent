import { callOllama } from '@/lib/ollama-client';
import { AgentProposal } from '@/types/twin';

export class CommercialAdvisor {
  /**
   * Analyzes an idea for immediate commercial viability.
   */
  async analyzeIdea(idea: string): Promise<AgentProposal> {
    const prompt = `
      You are the Commercial Advisor for MAS-ZERO Sovereign Lab.
      Your goal is to evaluate the commercial potential of an idea.
      
      Look for:
      1. Market Gap (Fragility in competitors).
      2. Revenue Pathways (Direct, Affiliate, Subscription).
      3. Speed to Market (How fast can we build this?).
      
      Respond in JSON format:
      {
        "verdict": "accept" | "revise" | "reject",
        "confidence": 0.0-1.0,
        "risk": "low" | "med" | "high",
        "output": "Your detailed analysis",
        "reasoning_summary": "Short summary of reasoning",
        "issues": ["list", "of", "concerns"]
      }
    `;

    const response = await callOllama(idea, [
      { role: 'system', content: prompt },
      { role: 'user', content: idea }
    ]);

    try {
      return JSON.parse(response);
    } catch (e) {
      return {
        agent: 'architect' as any,
        verdict: 'revise',
        confidence: 0.1,
        risk: 'high',
        output: response,
        reasoning_summary: 'Parse failed',
        issues: ['invalid_json']
      };
    }
  }
}
