// ============================================================
// MyDigitalTwin — Core Type Definitions
// All PocketBase collection shapes + API DTOs
// ============================================================

/** PocketBase base record shape */
export interface PBRecord {
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
}

// ----------------------------------------------------------
// PocketBase Collection: user_profiles
// ----------------------------------------------------------
export interface ProfileSnapshot {
  adaptations: {
    tone: string;
    detail_level: string;
    humor: string;
    last_shift_note?: string;
  };
  top_facts: string[];
  last_updated: string;
}

export interface UserProfile extends PBRecord {
  user_id: string;
  display_name: string;
  personality_desc: string;
  tone: string;
  context_main: string;
  context_soul: string;
  context_guards: string;
  profile_snapshot: ProfileSnapshot;
  learning_progress: number;
  total_conversations: number;
  onboarding_complete: boolean;
}

// ----------------------------------------------------------
// PocketBase Collection: conversations
// ----------------------------------------------------------
export interface ConversationMessage extends PBRecord {
  user_id: string;
  session_id: string;
  role: 'user' | 'twin';
  content: string;
  detected_emotion?: string;
  turn_index: number;
  turn_id?: string;
  message_id?: string;
}

export interface ConversationTurn extends PBRecord {
  user_id: string;
  session_id: string;
  turn_index: number;
  idempotency_key?: string;
  status: 'processing' | 'completed' | 'failed';
  request_message_id: string;
  response_content?: string;
  user_message_id?: string;
  twin_message_id?: string;
  trace_id?: string;
}

export interface SessionCounter extends PBRecord {
  user_id: string;
  session_id: string;
  next_turn_index: number;
}

// ----------------------------------------------------------
// PocketBase Collection: facts
// ----------------------------------------------------------
export interface Fact extends PBRecord {
  user_id: string;
  fact: string;
  fact_text?: string;
  fact_fingerprint?: string;
  category: 'preference' | 'biographical' | 'habit' | 'goal' | 'emotion';
  confidence: number;
  should_store: boolean;
  evidence_span?: string;
  reinforced_count: number;
  source_session?: string;
  status?: 'active' | 'reinforced' | 'conflicted' | 'archived';
  source?: string;
  last_reinforced_at?: string;
  conflict_group_id?: string;
}

// ----------------------------------------------------------
// PocketBase Collection: research_gems
// ----------------------------------------------------------
export interface ResearchGem extends PBRecord {
  user_id: string;
  title: string;
  content: string;
  category: string;
  relevance_score: number;
  status: 'new' | 'saved' | 'archived';
  implementation_notes?: string;
}

// ----------------------------------------------------------
// PocketBase Collection: skill_drafts
// ----------------------------------------------------------
export interface SkillDraft extends PBRecord {
  user_id: string;
  proposed_name: string;
  proposed_code?: string;
  trace_id: string;
  status: 'pending' | 'deployed' | 'rejected';
}

// ----------------------------------------------------------
// PocketBase Collection: improvement_proposals
// ----------------------------------------------------------
export interface ImprovementProposal extends PBRecord {
  user_id?: string;
  subsystem: string;
  proposal_type: string;
  hypothesis: string;
  proposed_change: {
    key: string;
    value: unknown;
    reason: string;
  };
  status: 'pending' | 'applied' | 'rejected';
}

// ----------------------------------------------------------
// PocketBase Collection: learning_logs
// ----------------------------------------------------------
export interface LearningLog extends PBRecord {
  user_id: string;
  session_id: string;
  turn_range: string;
  raw_analysis: ReflectionResult;
  facts_stored: number;
  progress_delta: number;
}

// ----------------------------------------------------------
// API DTOs — Small payloads for mobile optimization
// ----------------------------------------------------------

/** POST /api/conversation — Request */
export interface ConversationRequest {
  userId: string;
  message: string;
  sessionId?: string;
  idempotencyKey?: string;
}

/** POST /api/conversation — Response (minimal DTO) */
export interface ConversationResponse {
  reply: string;
  sessionId: string;
  turnIndex: number;
  messageId?: string;
  turnId?: string;
  idempotentReplay?: boolean;
  etag?: string;
}

/** GET /api/profile — Response (summary DTO, not full profile) */
export interface ProfileSummaryDTO {
  displayName: string;
  learningProgress: number;
  totalConversations: number;
  onboardingComplete: boolean;
  adaptations: ProfileSnapshot['adaptations'];
}

/** GET /api/facts — Response with cursor pagination */
export interface FactsPageDTO {
  items: FactSummaryDTO[];
  nextCursor?: string;
  total: number;
}

export interface FactSummaryDTO {
  id: string;
  fact: string;
  category: string;
  confidence: number;
  reinforcedCount: number;
  evidenceSpan?: string;
}

// ----------------------------------------------------------
// UI & Dashboard DTOs
// ----------------------------------------------------------

/** Unified chat message for UI display */
export interface UIMessage {
  role: 'user' | 'twin';
  content: string;
  traceId?: string;
  detectedEmotion?: string;
}

// ----------------------------------------------------------
// Reflection Engine Types (used by Go sidecar)
// ----------------------------------------------------------
export interface ReflectionResult {
  new_facts: Array<{
    fact: string;
    category: 'preference' | 'biographical' | 'habit';
    confidence: number;
    should_store_fact: boolean;
    evidence_span: string;
  }>;
  sentiment_signals: {
    likes: string[];
    dislikes: string[];
  };
  persona_adjustments: {
    recommended_shift: string;
    learning_progress_delta: number;
  };
}
