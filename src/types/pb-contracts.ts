/**
 * AUTO-GENERATED FROM pb_schema.json
 * DO NOT EDIT DIRECTLY
 */

export interface UserProfiles {
  id: string;
  created: string;
  updated: string;
  user_id: string;
  display_name: string;
  personality_desc: string;
  tone: string;
  context_main?: string;
  context_soul?: string;
  context_guards?: string;
  profile_snapshot?: any;
  learning_progress?: number;
  total_conversations?: number;
  onboarding_complete?: boolean;
}

export interface Conversations {
  id: string;
  created: string;
  updated: string;
  user_id: string;
  session_id: string;
  role: string;
  content: string;
  turn_index: number;
}

export interface Facts {
  id: string;
  created: string;
  updated: string;
  user_id: string;
  fact_text: string;
  category: string;
  tags?: any;
  confidence: number;
  reinforced_count?: number;
  is_active?: boolean;
  importance?: number;
  source_conversation?: string;
  last_reinforced_at?: string;
  fact_fingerprint?: string;
  status?: string;
  source?: string;
  conflict_group_id?: string;
}

export interface MemoryEdges {
  id: string;
  created: string;
  updated: string;
  user_id: string;
  source_fact: string;
  target_fact: string;
  relationship_type: string;
  weight?: number;
  created_by: string;
  confidence?: number;
}

export interface FactRevisions {
  id: string;
  created: string;
  updated: string;
  user_id: string;
  conflict_group_id: string;
  previous_fact_id?: string;
  previous_fact: string;
  revision_fact: string;
  category: string;
  reason: string;
  source?: string;
}

export interface Traces {
  id: string;
  created: string;
  updated: string;
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  name: string;
  kind: string;
  status: string;
  start_time: string;
  end_time: string;
  duration_ms: number;
  session_id?: string;
  user_id_hash?: string;
  request_type?: string;
  component?: string;
  attributes_json?: any;
  events_json?: any;
  links_json?: any;
  redaction_level?: number;
}

export interface AppConfig {
  id: string;
  created: string;
  updated: string;
  key: string;
  value: any;
  version: number;
  is_active?: boolean;
  category: string;
}

export interface Feedback {
  id: string;
  created: string;
  updated: string;
  user_id: string;
  trace_id: string;
  response_id?: string;
  rating: number;
  tags?: any;
  comment?: string;
  metadata?: any;
}

export interface ImprovementProposals {
  id: string;
  created: string;
  updated: string;
  subsystem: string;
  proposal_type: string;
  hypothesis: string;
  proposed_change: any;
  status: string;
  eval_metrics_before?: any;
  eval_metrics_after?: any;
  rollback_id?: string;
}

export interface AuditLog {
  id: string;
  created: string;
  updated: string;
  proposal_id: string;
  actor: string;
  action: string;
  reason: string;
  before_config?: any;
  after_config?: any;
}

export interface EvalRuns {
  id: string;
  created: string;
  updated: string;
  proposal_id?: string;
  run_date: string;
  dataset_version: string;
  results: any;
  metrics_summary: any;
  status: string;
}

export interface ResearchGems {
  id: string;
  created: string;
  updated: string;
  user_id: string;
  title: string;
  url?: string;
  content: string;
  relevance_score: number;
  category: string;
  status: string;
  implementation_notes?: string;
}

export interface ResearchConfig {
  id: string;
  created: string;
  updated: string;
  user_id: string;
  current_focus: string;
  excluded_topics?: any;
  last_run?: string;
  is_active?: boolean;
}

export interface SkillDrafts {
  id: string;
  created: string;
  updated: string;
  user_id: string;
  trace_id: string;
  proposed_name: string;
  proposed_metadata: any;
  proposed_instructions: string;
  status: string;
  backtest_result?: any;
}

export interface CausalNodes {
  id: string;
  created: string;
  updated: string;
  user_id: string;
  label: string;
  normalized_label: string;
  node_type: string;
}

export interface CausalEdges {
  id: string;
  created: string;
  updated: string;
  user_id: string;
  source: string;
  target: string;
  relation_type: string;
  weight?: number;
  evidence?: string;
  fingerprint: string;
  evidence_count?: number;
  contradiction_count?: number;
  last_observed_at?: string;
}

export interface ConsensusLogs {
  id: string;
  created: string;
  updated: string;
  user_id: string;
  session_id?: string;
  user_message: string;
  final_verdict: any;
  latency_ms?: number;
}

