export interface OpportunityEvidence {
  source: 'github' | 'market' | 'user';
  summary: string;
  traceUrl?: string;
  confidence: number;
}

export interface OpportunityCard {
  id: string;
  problem_statement: string;
  target_user: string;
  urgency_score: number;
  implementation_effort: number;
  estimated_value: number;
  ROI_score: number;
  moat_hint: string;
  first_PoC_steps: string[];
  why_now: string;
  kill_criteria: string[];
  dependency_risk: number;
  legal_privacy_uncertainty: number;
  data_confidence: number;
  evidence: OpportunityEvidence[];
  fit_score: number;
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
