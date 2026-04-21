import { env } from '@/lib/env';
import { callOllama } from '@/lib/ollama-client';
import { obs } from '@/lib/observability/observability-service';
import { 
  ConsensusInput, 
  ConsensusVerdict, 
  AgentProposal, 
  RiskFlags 
} from '@/types/twin';
import { 
  PLANNER_PROMPT, 
  EXPLORE_SCOUT_PROMPT,
  EXPLORE_ARCHITECT_PROMPT,
  COLLAPSE_SELECTOR_PROMPT,
  ATTACK_GHOST_PROMPT,
  ATTACK_FAILURE_CASINO_PROMPT,
  BUILD_IMPLEMENTER_PROMPT,
  BUILD_COST_CONTROLLER_PROMPT,
  BUILD_TOURNAMENT_PROMPT,
  CEO_SYNTHESIZER_PROMPT,
  BULL_ARCHITECT_PROMPT,
  OPPORTUNITY_SCOUT_PROMPT,
  BEAR_GHOST_CUSTOMER_PROMPT,
  VENTURE_RISK_MANAGER_PROMPT,
  DISTRIBUTION_AGENT_PROMPT,
  ENGINEERING_SIMULATOR_PROMPT,
  WORKFLOW_DESIGNER_PROMPT,
  CREATIVE_DESIGNER_PROMPT,
  MARKET_SIMULATOR_PROMPT,
  REVENUE_SIMULATOR_PROMPT,
  CEO_RANKER_PROMPT
} from './prompts';
import { executeSaveMemory, executeRecallMemory } from '@/lib/memory-engine';


const STAGE_TIMEOUT_MS = 10000;
const TOTAL_VENTURE_TIMEOUT_MS = 45000;
const MAX_CALLS_PER_RUN = 10;

const DEFAULT_FLAGS: RiskFlags = {
  prompt_injection: false,
  hallucination_risk: false,
  privacy_leak_risk: false,
  policy_risk: false,
};

async function runWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('STAGE_TIMEOUT')), timeoutMs);
  });
  return await Promise.race([fn(), timeoutPromise]);
}

function safeParseProposal(raw: string, agent: string): AgentProposal {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const cleanRaw = jsonMatch ? jsonMatch[0] : raw;
    const parsed = JSON.parse(cleanRaw);
    return {
      agent: agent as any,
      verdict: parsed.verdict || 'revise',
      confidence: parsed.confidence || 0.5,
      risk: parsed.risk || 'med',
      output: parsed.output || raw,
      reasoning_summary: parsed.reasoning_summary || '',
      issues: parsed.issues || [],
      metadata: parsed
    };
  } catch (e) {
    return {
      agent: agent as any,
      verdict: 'revise',
      confidence: 0.1,
      risk: 'high',
      output: raw,
      reasoning_summary: 'Parse failed',
      issues: ['invalid_json']
    };
  }
}

export async function runConsensus(input: ConsensusInput): Promise<ConsensusVerdict> {
  const start = Date.now();
  const isVenture = input.userMessage.toLowerCase().includes('venture') || 
                    input.userMessage.toLowerCase().includes('profit') ||
                    input.userMessage.toLowerCase().includes('alpha');

  if (isVenture) {
    return await runVentureLabCycle(input, start);
  }

  // Fallback to standard Planner loop (simplified for now)
  const reply = await callOllama(input.userMessage, [
    { role: 'system', content: PLANNER_PROMPT },
    { role: 'user', content: input.userMessage }
  ]);
  
  return {
    final_answer: reply,
    confidence: 0.9,
    risk: 'low',
    fallback_used: false,
    timed_out: false,
    latency_ms: Date.now() - start,
    disagreement: false,
    planner: safeParseProposal(reply, 'planner'),
    critic: safeParseProposal('', 'critic'),
    guardian: safeParseProposal('', 'guardian'),
    risk_flags: DEFAULT_FLAGS,
  };
}

/**
 * VENTURE LAB CYCLE (DIALECTIC VERSION)
 * 1. Facts & Bull Case
 * 2. Skepticism & Bear Case
 * 3. Distribution & Growth
 * 4. Ranking & Synthesis
 */
async function runVentureLabCycle(input: ConsensusInput, start: number): Promise<ConsensusVerdict> {
  const userId = input.userId || 'system';
  
  // --- PRE-FLIGHT: NEGATIVE MEMORY LOOKUP ---
  const pastObjections = await executeRecallMemory(userId, 'venture_objection');

  return await obs.trace('venture_lab_cycle', {}, async (span) => {
    let callCount = 0;
    const context = {
      userMessage: input.userMessage,
      pastFailures: pastObjections,
    };

    // --- STAGE 1: EXPLORE (Divergence) ---
    const scoutRaw = await runWithTimeout<string>(() => {
      callCount++;
      return callOllama(input.userMessage, [
        { role: 'system', content: EXPLORE_SCOUT_PROMPT },
        { role: 'user', content: `GOAL: ${context.userMessage}\nPAST_FAILURES: ${context.pastFailures}` }
      ]);
    }, STAGE_TIMEOUT_MS);
    const scout = safeParseProposal(scoutRaw, 'scout');

    const architectRaw = await runWithTimeout<string>(() => {
      callCount++;
      return callOllama(input.userMessage, [
        { role: 'system', content: EXPLORE_ARCHITECT_PROMPT },
        { role: 'user', content: `DIRECTIONS: ${scout.output}` }
      ]);
    }, STAGE_TIMEOUT_MS);
    const architect = safeParseProposal(architectRaw, 'architect');

    // --- STAGE 2: COLLAPSE (Convergence) ---
    const selectionRaw = await runWithTimeout<string>(() => {
      callCount++;
      return callOllama(input.userMessage, [
        { role: 'system', content: COLLAPSE_SELECTOR_PROMPT },
        { role: 'user', content: `ALL_DIRECTIONS: ${scout.output}\nARCHITECT_VIEW: ${architect.output}` }
      ]);
    }, STAGE_TIMEOUT_MS);
    const selection = safeParseProposal(selectionRaw, 'workflow_designer'); // Mapping to workflow_designer for type compatibility

    // --- STAGE 3: ATTACK (The Crucible) ---
    const ghostRaw = await runWithTimeout<string>(() => {
      callCount++;
      return callOllama(input.userMessage, [
        { role: 'system', content: ATTACK_GHOST_PROMPT },
        { role: 'user', content: `TOP_3_DIRECTIONS: ${selection.output}` }
      ]);
    }, STAGE_TIMEOUT_MS);
    const ghost = safeParseProposal(ghostRaw, 'critic');

    const casinoRaw = await runWithTimeout<string>(() => {
      callCount++;
      return callOllama(input.userMessage, [
        { role: 'system', content: ATTACK_FAILURE_CASINO_PROMPT },
        { role: 'user', content: `PROPOSAL: ${selection.output}\nOBJECTIONS: ${ghost.output}` }
      ]);
    }, STAGE_TIMEOUT_MS);
    const casino = safeParseProposal(casinoRaw, 'market_simulator');

    // --- STAGE 4: BUILD (Self-Play Engineering) ---
    const implementerRaw = await runWithTimeout<string>(() => {
      callCount++;
      return callOllama(input.userMessage, [
        { role: 'system', content: BUILD_IMPLEMENTER_PROMPT },
        { role: 'user', content: `SELECTION: ${selection.output}\nSTRESS_TEST: ${casino.output}` }
      ]);
    }, STAGE_TIMEOUT_MS);
    const implementer = safeParseProposal(implementerRaw, 'execution');

    const costRaw = await runWithTimeout<string>(() => {
      callCount++;
      return callOllama(input.userMessage, [
        { role: 'system', content: BUILD_COST_CONTROLLER_PROMPT },
        { role: 'user', content: `BUILD_PLAN: ${implementer.output}` }
      ]);
    }, STAGE_TIMEOUT_MS);
    const cost = safeParseProposal(costRaw, 'revenue_simulator');

    const tournamentRaw = await runWithTimeout<string>(() => {
      callCount++;
      return callOllama(input.userMessage, [
        { role: 'system', content: BUILD_TOURNAMENT_PROMPT },
        { role: 'user', content: `IMPLEMENTER: ${implementer.output}\nCOST_LIMITS: ${cost.output}` }
      ]);
    }, STAGE_TIMEOUT_MS);
    const tournament = safeParseProposal(tournamentRaw, 'creative_designer');

    // --- STAGE 5: SYNTHESIS (Final Verdict) ---
    const ceoRaw = await runWithTimeout<string>(() => {
      callCount++;
      return callOllama(input.userMessage, [
        { role: 'system', content: CEO_SYNTHESIZER_PROMPT },
        { role: 'user', content: JSON.stringify({ 
          scout: scout.output, 
          architect: architect.output, 
          selection: selection.output, 
          attack: { ghost: ghost.output, casino: casino.output },
          build: { implementer: implementer.output, cost: cost.output, tournament: tournament.output }
        }) }
      ]);
    }, STAGE_TIMEOUT_MS);
    const ceo = safeParseProposal(ceoRaw, 'ceo');

    // --- PERSISTENCE: NEGATIVE MEMORY BANK ---
    if (ceo.verdict === 'reject' || ghost.confidence > 0.8) {
      const objection = `[FAILURE_MODE] ${ceo.reasoning_summary} | Critic: ${ghost.output.slice(0, 200)}...`;
      await executeSaveMemory(userId, objection, 'venture_objection');
    }

    return {
      final_answer: ceo.output,
      confidence: ceo.confidence,
      risk: ceo.risk,
      fallback_used: false,
      timed_out: false,
      latency_ms: Date.now() - start,
      disagreement: ceo.verdict === 'reject',
      planner: architect,
      critic: ghost,
      guardian: cost,
      risk_flags: DEFAULT_FLAGS,
      is_venture_cycle: true,
      architect,
      scout,
      risk_manager: casino,
      execution: implementer,
      distribution: selection,
      workflow_designer: selection,
      creative_designer: tournament,
      market_simulator: casino,
      revenue_simulator: cost,
      ceo,
      fragility_map: ceo.metadata?.fragility_map || casino.metadata?.fragility_map || {}
    };
  });
}

function createKillSwitchVerdict(reason: string, latency: number): ConsensusVerdict {
  return {
    final_answer: `[KILL-SWITCH] ${reason}. Aborting run to save compute.`,
    confidence: 0,
    risk: 'high',
    fallback_used: true,
    timed_out: false,
    latency_ms: latency,
    disagreement: true,
    planner: safeParseProposal('', 'planner'),
    critic: safeParseProposal('', 'critic'),
    guardian: safeParseProposal('', 'guardian'),
    risk_flags: DEFAULT_FLAGS,
  };
}
