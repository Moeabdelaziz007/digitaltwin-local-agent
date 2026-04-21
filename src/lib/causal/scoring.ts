const DAY_MS = 24 * 60 * 60 * 1000;

export interface CausalEdgeSignal {
  baseWeight?: number;
  evidenceCount?: number;
  lastObservedAt?: string;
  contradictionCount?: number;
}

export interface CausalScoreBreakdown {
  edgeStrength: number;
  recencyFactor: number;
  contradictionPenalty: number;
  finalScore: number;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function computeRecencyDecay(lastObservedAt?: string, now = new Date()): number {
  if (!lastObservedAt) return 0.75;
  const observed = new Date(lastObservedAt);
  if (Number.isNaN(observed.getTime())) return 0.75;

  const ageDays = Math.max(0, (now.getTime() - observed.getTime()) / DAY_MS);
  // Half-life ~ 30 days
  return Math.exp((-Math.log(2) * ageDays) / 30);
}

export function computeContradictionPenalty(contradictionCount = 0): number {
  if (contradictionCount <= 0) return 1;
  return 1 / (1 + contradictionCount * 0.6);
}

export function computeEdgeStrength(baseWeight = 0.5, evidenceCount = 1): number {
  const normalizedWeight = clamp01(baseWeight);
  const reinforcement = Math.log1p(Math.max(1, evidenceCount));
  const normalizedReinforcement = Math.min(1, reinforcement / Math.log1p(12));
  return clamp01(0.55 * normalizedWeight + 0.45 * normalizedReinforcement);
}

export function scoreCausalEdge(signal: CausalEdgeSignal): CausalScoreBreakdown {
  const edgeStrength = computeEdgeStrength(signal.baseWeight, signal.evidenceCount);
  const recencyFactor = computeRecencyDecay(signal.lastObservedAt);
  const contradictionPenalty = computeContradictionPenalty(signal.contradictionCount ?? 0);

  const finalScore = clamp01(edgeStrength * recencyFactor * contradictionPenalty);
  return {
    edgeStrength,
    recencyFactor,
    contradictionPenalty,
    finalScore,
  };
}
