/**
 * src/lib/consensus/circuit-breaker.ts
 * Intelligent Circuit Breaker for LLM Orchestration.
 * Prevents cascading failures and manages resource exhaustion.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening the circuit
  recoveryTimeoutMs: number;     // Time to wait in OPEN state before trying HALF_OPEN
  successThreshold: number;      // Number of successes in HALF_OPEN to close the circuit
  maxLatencyMs: number;          // Latency threshold for "soft" failure
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 3,
      recoveryTimeoutMs: 30000,
      successThreshold: 2,
      maxLatencyMs: 15000,
      ...config
    };
  }

  async execute<T>(fn: () => Promise<T>, fallback: T | (() => Promise<T>)): Promise<T> {
    const getFallback = async () => {
      if (typeof fallback === 'function') {
        return await (fallback as () => Promise<T>)();
      }
      return fallback;
    };

    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeoutMs) {
        this.state = 'HALF_OPEN';
        console.log('[CIRCUIT-BREAKER] Attempting recovery (HALF_OPEN)');
      } else {
        console.warn('[CIRCUIT-BREAKER] Circuit is OPEN. Executing fallback.');
        return await getFallback();
      }
    }

    const start = Date.now();
    try {
      const result = await fn();
      const latency = Date.now() - start;

      if (latency > this.config.maxLatencyMs) {
        console.warn(`[CIRCUIT-BREAKER] Soft failure: high latency (${latency}ms)`);
        this.recordFailure();
      } else {
        this.recordSuccess();
      }

      return result;
    } catch (error) {
      console.error('[CIRCUIT-BREAKER] Execution failure:', error);
      this.recordFailure();
      return await getFallback();
    }
  }


  private recordSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
        console.log('[CIRCUIT-BREAKER] Circuit CLOSED (Recovered)');
      }
    }
  }

  private recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
      console.error('[CIRCUIT-BREAKER] Threshold reached. Circuit is now OPEN.');
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Singleton instances for common services
export const ollamaBreaker = new CircuitBreaker({
  failureThreshold: 2,
  recoveryTimeoutMs: 15000,
  maxLatencyMs: 12000
});
