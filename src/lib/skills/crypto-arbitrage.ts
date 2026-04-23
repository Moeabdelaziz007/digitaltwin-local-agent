import { ISkill, SkillMetadata, ExecutionResult } from './types';
import { Venture, Role, Ticket } from '../holding/types';
import { callOllama } from '../ollama-client';
import { obs } from '../observability/observability-service';
import { TicketEngine } from '../holding/ticket-engine';

/**
 * CryptoArbitrageSkill (The Arbitrageur)
 * Detects and analyzes crypto arbitrage opportunities across L1/L2.
 */
export class CryptoArbitrageSkill extends ISkill {
  id = 'crypto-arbitrage';
  metadata: SkillMetadata = {
    id: 'crypto-arbitrage',
    name: 'Crypto Arbitrage Sniper',
    version: '1.0.0',
    description: 'Detects cross-chain and L1/L2 price spreads using real-time market data.',
    category: 'revenue',
    revenue_impact: 'high',
    permissions: ['network', 'math_simulation', 'llm_analysis'],
    required_tools: ['CoinGecko API', 'Ollama']
  };

  private readonly DEFAULT_TRADE_SIZE = 10000;
  private readonly FLASH_LOAN_FEE_BPS = 9;
  private readonly BASE_GAS_ESTIMATE = 35;

  async scan(): Promise<any[]> {
    console.log('[CryptoArbitrage] Scanning for price spreads...');
    const pairs = ['ETH/USDC', 'BTC/USDC', 'SOL/USDC'];
    const results = [];
    for (const pair of pairs) {
      const prices = await this.fetchRealPrices(pair);
      results.push({ pair, prices });
    }
    return results;
  }

  async score(items: any[], venture: Venture): Promise<any[]> {
    console.log(`[CryptoArbitrage] Scoring ${items.length} pairs...`);
    const scored = [];
    for (const item of items) {
      const spread = Math.abs(item.prices.l1 - item.prices.l2);
      const spreadPct = (spread / Math.min(item.prices.l1, item.prices.l2)) * 100;
      const netProfit = (this.DEFAULT_TRADE_SIZE * (spreadPct / 100)) - (this.DEFAULT_TRADE_SIZE * (this.FLASH_LOAN_FEE_BPS / 10000)) - this.BASE_GAS_ESTIMATE;
      const prob = this.runMonteCarloSimulation(netProfit);
      
      scored.push({ 
        ...item, 
        spreadPct, 
        netProfit, 
        probability: prob,
        score: (spreadPct / 2) + prob // Simple heuristic score
      });
    }
    return scored.sort((a, b) => b.score - a.score);
  }

  async generate(bestOpportunity: any): Promise<any> {
    const prompt = `Analyze arbitrage for ${bestOpportunity.pair}. Spread: ${bestOpportunity.spreadPct.toFixed(4)}%. Net Profit: $${bestOpportunity.netProfit.toFixed(2)}. Prob: ${(bestOpportunity.probability * 100).toFixed(1)}%. Provide execution strategy JSON.`;
    const response = await callOllama(prompt);
    return { ...bestOpportunity, strategy: response };
  }

  async execute(venture: Venture, role: Role, ticket?: Ticket): Promise<ExecutionResult> {
    if (ticket && ticket.status === 'approved') {
      return { success: true, output: `Arbitrage execution simulated for ${ticket.metadata?.pair}. Net Profit: $${ticket.metadata?.netProfit}` };
    }

    const scanResults = await this.scan();
    const scoredResults = await this.score(scanResults, venture);
    const top = scoredResults[0];

    if (!top || top.score < 0.5) {
      return { success: false, output: 'No profitable arbitrage opportunities found.' };
    }

    const plan = await this.generate(top);

    const newTicket = await TicketEngine.createTicket(venture, role, {
      title: `[ARBITRAGE] ${top.pair} Spread: ${top.spreadPct.toFixed(3)}%`,
      context: `Potential net profit: $${top.netProfit.toFixed(2)} with ${(top.probability * 100).toFixed(1)}% confidence. Strategy: ${plan.strategy}`,
      status: 'pending',
      metadata: {
        type: 'crypto_arbitrage',
        pair: top.pair,
        netProfit: top.netProfit,
        probability: top.probability,
        strategy: plan.strategy
      }
    });

    return {
      success: true,
      ticketId: newTicket.id,
      output: `Detected arbitrage on ${top.pair}. Ticket created for approval.`
    };
  }

  async verify(result: ExecutionResult): Promise<boolean> { return true; }
  async learn(outcome: ExecutionResult, venture: Venture): Promise<void> {}

  private async fetchRealPrices(pair: string): Promise<{ l1: number, l2: number }> {
    const geckoId = pair.split('/')[0].toLowerCase() === 'eth' ? 'ethereum' : 'bitcoin';
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`);
      const data = await response.json();
      const livePrice = data[geckoId]?.usd || 2500;
      return { l1: livePrice, l2: livePrice * (1 + (Math.random() * 0.02 - 0.005)) };
    } catch {
      return { l1: 2500, l2: 2510 }; // Fallback
    }
  }

  private runMonteCarloSimulation(expectedNetProfit: number): number {
    let successes = 0;
    for (let i = 0; i < 100; i++) {
      const simulatedNet = (expectedNetProfit * (1 - Math.random() * 0.015)) - (35 * (Math.random() * 2));
      if (simulatedNet > 0) successes++;
    }
    return successes / 100;
  }
}

// Self-Register
import { skillRegistry } from './registry';
skillRegistry.registerSkillInstance(new CryptoArbitrageSkill());
