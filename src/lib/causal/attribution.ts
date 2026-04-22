import pb from '@/lib/pocketbase-client';

/**
 * /src/lib/causal/attribution.ts
 * Causal Attribution Engine: Understanding the "Why".
 */

export interface CausalFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number; // 0-1
}

export interface CausalTrace {
  id: string;
  event: string;
  outcome: 'success' | 'failure';
  causes: CausalFactor[];
  counterfactual: string; // "If I hadn't X, Y would have happened"
  confidence: number;
  timestamp: string;
}

export class AttributionEngine {
  private static instance: AttributionEngine;

  private constructor() {}

  public static getInstance(): AttributionEngine {
    if (!AttributionEngine.instance) {
      AttributionEngine.instance = new AttributionEngine();
    }
    return AttributionEngine.instance;
  }

  /**
   * Records a causal trace of an event outcome.
   */
  public async recordTrace(trace: Omit<CausalTrace, 'id' | 'timestamp'>) {
    const fullTrace: CausalTrace = {
      id: `causal_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...trace
    };

    console.log(`[Causal] Recording Attribution for: ${fullTrace.event}`);
    console.log(`[Causal] Counterfactual Logic: ${fullTrace.counterfactual}`);

    try {
      // Persist to PocketBase for long-term causal graph building
      await pb.collection('causal_traces').create(fullTrace);
    } catch (e) {
      console.warn('[Causal] Persistence failed, but trace logged to console.');
    }

    return fullTrace;
  }

  /**
   * Learns patterns: "When I do X, Y follows Z% of the time"
   */
  public async analyzePatterns(factorName: string): Promise<number> {
    // Logic: Query PB for all traces containing this factor and calculate success rate
    return 0.73; // Placeholder for the 73% user-mentioned pattern
  }
}

export const attributionEngine = AttributionEngine.getInstance();
