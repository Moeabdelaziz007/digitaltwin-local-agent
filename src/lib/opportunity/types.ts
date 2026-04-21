export interface OpportunityEvidence {
  source: 'user' | 'market' | 'github';
  summary: string;
  traceUrl?: string;
  confidence: number;
}

export interface OpportunityCard {
  id: string;
  problem_statement: string;
  target_user: string;
  urgency_score: number; // 0-1
  implementation_effort: number; // 1-10
  estimated_value: number; // 1-10
  ROI_score: number;
  moat_hint: string;
  first_PoC_steps: string[];
  why_now: string;
  kill_criteria: string[];
  dependency_risk: number; // 0-1
  legal_privacy_uncertainty: number; // 0-1
  data_confidence: number; // 0-1
  evidence: OpportunityEvidence[];
  fit_score: number; // 0 or 1
}

export interface ConnectorInput {
  userFocus?: string[];
  githubRepo?: string;
  trendKeywords?: string[];
}

export interface GitHubSignal {
  issueVelocity: number;
  prVelocity: number;
  openIssues: number;
  openPRs: number;
  hotLabels: string[];
  sourceUrl?: string;
  confidence: number;
}

export interface MarketSignal {
  keyword: string;
  momentum: number;
  headline: string;
  sourceUrl?: string;
  confidence: number;
}

export interface UserSignal {
  painPoint: string;
  frequency: number;
  severity: number;
  sourceRef?: string;
  confidence: number;
}

export interface RankerWeights {
  urgencyWeight: number;
  feasibilityWeight: number;
  valueWeight: number;
  dependencyPenaltyWeight: number;
  legalPenaltyWeight: number;
  confidencePenaltyWeight: number;
}
