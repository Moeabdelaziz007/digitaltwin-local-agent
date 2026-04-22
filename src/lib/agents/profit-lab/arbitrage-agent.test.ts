import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArbitrageAgent } from './arbitrage-agent';
import { callOllama } from '@/lib/ollama-client';

// Mock Ollama
vi.mock('@/lib/ollama-client', () => ({
  callOllama: vi.fn(),
}));

describe('ArbitrageAgent', () => {
  let agent: ArbitrageAgent;

  beforeEach(() => {
    agent = new ArbitrageAgent();
    vi.clearAllMocks();
  });

  it('should correctly calculate deterministic math', async () => {
    // Mock prices: L1=2400, L2=2424 (1% spread)
    // We need to spy on private method or test public method with controlled random
    // For now, let's test simulateArbitrage which calls fetchRealPrices
    // We'll mock fetchRealPrices by spying on the instance
    const fetchSpy = vi.spyOn(agent as any, 'fetchRealPrices').mockResolvedValue({ l1: 2400, l2: 2424 });
    
    (callOllama as any).mockResolvedValue(JSON.stringify({ 
      commentary: "High probability execution recommended.", 
      risk_level: "low" 
    }));

    const result = await agent.simulateArbitrage('ETH/USDC');

    expect(result.math.spreadPercentage).toBeCloseTo(1.0, 1);
    expect(result.math.grossProfit).toBeCloseTo(10.0, 1); // 1000 * 0.01
    expect(result.math.netProfit).toBeGreaterThan(0);
    expect(result.risk_level).toBe('low');
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('should run Monte Carlo simulation with varying results', () => {
    // Testing the private method runMonteCarloSimulation
    const mcResult = (agent as any).runMonteCarloSimulation(100);
    expect(mcResult).toBeGreaterThanOrEqual(0);
    expect(mcResult).toBeLessThanOrEqual(1);
  });

  it('should handle LLM failure gracefully', async () => {
    vi.spyOn(agent as any, 'fetchRealPrices').mockResolvedValue({ l1: 2400, l2: 2424 });
    (callOllama as any).mockRejectedValue(new Error('Ollama Down'));

    const result = await agent.simulateArbitrage('ETH/USDC');
    expect(result.risk_level).toBe('high'); // Default fallback
    expect(result.strategy).toContain('Manual oversight required');
  });
});
