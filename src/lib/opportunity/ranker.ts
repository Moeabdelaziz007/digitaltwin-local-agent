import { OpportunityCard, RankerWeights } from '@/lib/opportunity/types';

const DEFAULT_WEIGHTS: RankerWeights = {
  urgencyWeight: 1,
  feasibilityWeight: 1,
  valueWeight: 1,
  dependencyPenaltyWeight: 0.35,
  legalPenaltyWeight: 0.3,
  confidencePenaltyWeight: 0.25,
};

let rankerWeights: RankerWeights = { ...DEFAULT_WEIGHTS };

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculates ROI_score based on weighted metrics and penalties.
 */
export function rankOpportunity(opportunity: OpportunityCard): OpportunityCard {
  const urgency = clamp(opportunity.urgency_score);
  const feasibility = clamp(1 - opportunity.implementation_effort / 10);
  const value = clamp(opportunity.estimated_value / 10);
  const effort = Math.max(1, opportunity.implementation_effort);

  const weightedValue = value * rankerWeights.valueWeight;
  const weightedUrgency = urgency * rankerWeights.urgencyWeight;
  const weightedFeasibility = feasibility * rankerWeights.feasibilityWeight;

  const baseROI = (weightedValue * weightedUrgency * weightedFeasibility * 100) / effort;

  const dependencyPenalty = opportunity.dependency_risk * rankerWeights.dependencyPenaltyWeight;
  const legalPenalty = opportunity.legal_privacy_uncertainty * rankerWeights.legalPenaltyWeight;
  const confidencePenalty = (1 - opportunity.data_confidence) * rankerWeights.confidencePenaltyWeight;

  const finalROI = Math.max(0, baseROI - (dependencyPenalty + legalPenalty + confidencePenalty) * 25);

  return {
    ...opportunity,
    ROI_score: Number(finalROI.toFixed(2)),
  };
}

/**
 * Ranks and returns top 3 opportunities.
 */
export function rankAndSort(opportunities: OpportunityCard[]): OpportunityCard[] {
  return opportunities
    .map(rankOpportunity)
    .sort((a, b) => b.ROI_score - a.ROI_score)
    .slice(0, 3);
}

/**
 * Dynamic calibration of weights based on outcome feedback.
 */
export function calibrateRankerWeights(actualEffort: number, actualValue: number, predictedROI: number): RankerWeights {
  const targetROI = (actualValue * 100) / Math.max(actualEffort, 1);
  const error = targetROI - predictedROI;
  const alpha = 0.03;

  rankerWeights = {
    urgencyWeight: clamp(rankerWeights.urgencyWeight + (error > 0 ? alpha : -alpha), 0.7, 1.4),
    feasibilityWeight: clamp(rankerWeights.feasibilityWeight + (error > 0 ? alpha * 0.8 : -alpha * 0.8), 0.7, 1.4),
    valueWeight: clamp(rankerWeights.valueWeight + (error > 0 ? alpha * 1.2 : -alpha * 1.2), 0.7, 1.5),
    dependencyPenaltyWeight: clamp(rankerWeights.dependencyPenaltyWeight + (error > 0 ? -alpha * 0.6 : alpha * 0.6), 0.15, 0.6),
    legalPenaltyWeight: clamp(rankerWeights.legalPenaltyWeight + alpha * 0.2, 0.15, 0.7),
    confidencePenaltyWeight: clamp(rankerWeights.confidencePenaltyWeight + alpha * 0.2, 0.15, 0.7),
  };

  return rankerWeights;
}

export function getRankerWeights(): RankerWeights {
  return rankerWeights;
}
