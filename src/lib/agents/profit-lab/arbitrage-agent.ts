/**
 * [STAGE-0 SIMULATION STUB]
 * ArbitrageAgent: A specialized agent for detecting and analyzing crypto arbitrage opportunities.
 * This is a simulation engine for storytelling and UI demonstration. 
 * It is NOT intended for automated high-frequency trading or MEV execution.
 * Uses deterministic math for calculations and LLM for strategic analysis.
 */

import { callOllama } from '@/lib/ollama-client';
import { obs } from '@/lib/observability/observability-service';

// --- CONFIGURATION CONSTANTS ---
const DEFAULT_TRADE_SIZE = 10000;
const FLASH_LOAN_FEE_BPS = 9; // 0.09%
const BASE_GAS_ESTIMATE = 35;
const MAX_LLM_RETRIES = 2;

export interface ArbitrageResult {
  agentName: string;
  pair: string;
  prices: { l1: number, l2: number };
  math: {
    spreadPercentage: number;
    flashLoanFee: number;
    estimatedGas: number;
    grossProfit: number;
    netProfit: number;
    probability: number;
  };
  strategy: string;
  risk_level: 'low' | 'med' | 'high';
  is_fallback: boolean;
  metadata: {
    source: 'llm' | 'local-fallback';
    retries?: number;
    latency_ms: number;
    sentiment?: string;
  };
  timestamp: string;
}

export class ArbitrageAgent {
  private name = 'The Arbitrageur';

  /**
   * Detects and analyzes arbitrage opportunities between L1 and L2.
   * Deterministic math is handled in TypeScript.
   */
  public async simulateArbitrage(pair: string = 'ETH/USDC'): Promise<ArbitrageResult> {
    const startTimestamp = Date.now();
    
    return await obs.trace('arbitrage_simulation', { attributes: { 'trade.pair': pair } }, async (span) => {
      try {
        // 1. DATA ACQUISITION
        const prices = await this.fetchRealPrices(pair);
        
        // 2. DETERMINISTIC COMPUTATION (The Source of Truth)
        const tradeSize = DEFAULT_TRADE_SIZE; 
        const spread = Math.abs(prices.l1 - prices.l2);
        const spreadPercentage = (spread / Math.min(prices.l1, prices.l2)) * 100;
        const flashLoanFee = tradeSize * (FLASH_LOAN_FEE_BPS / 10000);
        const estimatedGas = BASE_GAS_ESTIMATE; 
        const grossProfit = (tradeSize * (spreadPercentage / 100));
        const netProfit = grossProfit - flashLoanFee - estimatedGas;
        const probability = this.runMonteCarloSimulation(netProfit);

        // 3. CONTEXTUAL ANALYSIS (LLM only for qualitative synthesis)
        const context = {
          pair,
          metrics: {
            l1: prices.l1.toFixed(2),
            l2: prices.l2.toFixed(2),
            spread_pct: spreadPercentage.toFixed(4),
            net_profit: netProfit.toFixed(2),
            success_prob: (probability * 100).toFixed(1)
          }
        };

        const strategyPrompt = `
          [SYSTEM: FINANCIAL_ANALYST]
          Analyze the following verified arbitrage metrics:
          ${JSON.stringify(context, null, 2)}

          Task: Provide an execution strategy focusing ONLY on liquidity depth and mev-protection.
          Format: JSON { "commentary": "string", "risk_level": "low" | "med" | "high" }
        `;
        
        let strategyResponse: string = '';
        let isFallback = false;
        let retries = 0;

        try {
          // LLM Execution with Retry Pattern
          for (retries = 0; retries <= MAX_LLM_RETRIES; retries++) {
            try {
              strategyResponse = await callOllama(strategyPrompt);
              // Simple validation that we got a JSON-like response
              if (strategyResponse.includes('{')) break;
            } catch (retryErr) {
              if (retries === MAX_LLM_RETRIES) throw retryErr;
              console.warn(`[ArbitrageAgent] LLM Retry ${retries + 1}/${MAX_LLM_RETRIES} due to error:`, retryErr);
              await new Promise(resolve => setTimeout(resolve, 500 * (retries + 1))); // Exponential backoff
            }
          }
        } catch (e) {
          isFallback = true;
          console.error(`[ArbitrageAgent] LLM analysis exhausted retries, using local fallback.`, e);
          strategyResponse = JSON.stringify({
            commentary: "Strategy synthesis failed after retries. Local safety protocols triggered. Manual oversight required.",
            risk_level: "high",
            _source: "local-fallback"
          });
        }
        
        const strategy = this.parseAndValidateStrategy(strategyResponse);
        const latency = Date.now() - startTimestamp;

        // Structured Telemetry via OTel
        obs.recordLlmStats(span, {
          model_name: 'ollama/llama3',
          message_count: 2,
          role_sequence: 'system,user',
          input_chars: strategyPrompt.length,
          output_chars: strategyResponse.length,
          latency_ms: latency
        } as any);

        return {
          agentName: this.name,
          pair,
          prices,
          math: {
            spreadPercentage,
            flashLoanFee,
            estimatedGas,
            grossProfit,
            netProfit,
            probability
          },
          strategy: strategy.commentary,
          risk_level: strategy.risk_level as any,
          is_fallback: isFallback,
          metadata: {
            source: isFallback ? 'local-fallback' : 'llm',
            retries,
            latency_ms: latency
          },
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error(`[ArbitrageAgent] Operation failed at ${new Date().toISOString()}:`, error);
        throw error;
      }
    });
  }

  private parseAndValidateStrategy(content: string): { commentary: string, risk_level: string } {
    try {
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1) throw new Error('No JSON payload found');
      
      const jsonStr = content.substring(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(jsonStr);

      if (typeof parsed.commentary !== 'string' || parsed.commentary.length < 5) {
        throw new Error('Invalid commentary field');
      }
      const validRisks = ['low', 'med', 'high'];
      if (!validRisks.includes(parsed.risk_level)) {
        parsed.risk_level = 'high';
      }

      return {
        commentary: parsed.commentary,
        risk_level: parsed.risk_level
      };
    } catch (e) {
      return { 
        commentary: "Strategy synthesis failed. Manual oversight required for execution.", 
        risk_level: "high" 
      };
    }
  }

  /**
   * Real Price Fetching from CoinGecko API.
   * Falls back to simulation if API is rate-limited or unreachable.
   */
  private async fetchRealPrices(pair: string): Promise<{ l1: number, l2: number }> {
    const symbolMap: Record<string, string> = {
      'ETH/USDC': 'ethereum',
      'BTC/USDC': 'bitcoin',
      'SOL/USDC': 'solana',
      'LINK/USDC': 'chainlink'
    };

    const geckoId = symbolMap[pair] || 'ethereum';

    try {
      // CoinGecko public API (Rate limit: 10-50 calls/min)
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`;
      
      // We use a short timeout for responsiveness
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);

      if (!response.ok) throw new Error(`Gecko API error: ${response.status}`);

      const data = await response.json();
      const livePrice = data[geckoId]?.usd;

      if (!livePrice) throw new Error('Price data missing in response');

      // Since CoinGecko provides a single spot price, we simulate the L1/L2 spread 
      // around this real-world anchor. This is the hybrid "Technical Honesty" approach.
      const l1 = livePrice;
      const l2 = l1 * (1 + (Math.random() * 0.02 - 0.005)); // -0.5% to +1.5% spread
      
      console.log(`[ArbitrageAgent] Live price fetched for ${pair}: $${l1.toFixed(2)} (Gecko)`);
      return { l1, l2 };

    } catch (e) {
      console.warn(`[ArbitrageAgent] CoinGecko API unreachable, falling back to simulation:`, e);
      
      // Simulation Fallback
      const basePrice = pair.startsWith('ETH') ? 2400 : pair.startsWith('BTC') ? 60000 : 1.0;
      const l1 = basePrice + (Math.random() * 20 - 10);
      const l2 = l1 * (1 + (Math.random() * 0.03 - 0.01));
      return { l1, l2 };
    }
  }

  /**
   * Monte Carlo Simulation for Success Probability
   * Runs 1000 iterations of price/slippage volatility to estimate risk.
   */
  private runMonteCarloSimulation(expectedNetProfit: number): number {
    const iterations = 1000;
    let successes = 0;

    for (let i = 0; i < iterations; i++) {
      // Simulate slippage (0.1% to 1.5%)
      const slippage = 1 - (Math.random() * 0.015);
      // Simulate gas price spikes (up to 3x)
      const gasMultiplier = 1 + (Math.random() * 2);
      
      const simulatedNet = (expectedNetProfit * slippage) - (35 * (gasMultiplier - 1));
      
      if (simulatedNet > 0) {
        successes++;
      }
    }

    return successes / iterations;
  }
}

export const arbitrageAgent = new ArbitrageAgent();
