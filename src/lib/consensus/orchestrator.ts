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
  OPPORTUNITY_HUNTER_PROMPT,
  EVIDENCE_FORAGER_PROMPT,
  SIGNAL_MINER_PROMPT,
  PLAN_CACHE_KEEPER_PROMPT,
  VENTURE_CONDUCTOR_PROMPT,
  DEVILS_ADVOCATE_PROMPT,
  MARKET_SIMULATOR_PROMPT,
  BUILD_SIMULATOR_PROMPT,
  REVENUE_SIMULATOR_PROMPT,
  REVENUE_ARCHITECT_PROMPT,
  AFFILIATE_SCOUT_PROMPT,
  DISTRIBUTION_STRATEGIST_PROMPT,
  SPEC_BLACKSMITH_PROMPT,
  CEO_SYNTHESIZER_PROMPT,
  FAILURE_ARCHIVIST_PROMPT
} from './prompts';
import { executeSaveMemory, executeRecallMemory } from '@/lib/memory-engine';
import { VentureSentinelAgent } from '@/lib/agents/profit-lab/venture-sentinel';

const sentinel = new VentureSentinelAgent();


const STAGE_TIMEOUT_MS = 12000;
const TOTAL_VENTURE_TIMEOUT_MS = 60000;

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
      verdict: parsed.verdict || 'accept',
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
                    input.userMessage.toLowerCase().includes('alpha') ||
                    input.userMessage.toLowerCase().includes('revenue');

  if (isVenture) {
    return await runVentureLabCycle(input, start);
  }

  // Fallback to standard Planner loop
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
 * VENTURE LAB CYCLE (MAS-ZERO v3.5 - 14 AGENTS)
 * 1. EXPLORE: Hunter -> Forager -> Miner
 * 2. COLLAPSE: Cache -> Conductor
 * 3. ATTACK: Advocate -> Market Simulator
 * 4. BUILD: BuildSim -> RevSim -> Architect -> Affiliate -> Distribution
 * 5. SYNTHESIS: Blacksmith -> CEO -> Archivist
 */
async function runVentureLabCycle(input: ConsensusInput, start: number): Promise<ConsensusVerdict> {
  const userId = input.userId || 'system';
  
  return await obs.trace('venture_lab_v3.5', {}, async (span) => {
    // --- STAGE 1: EXPLORE (Divergence) ---
    const [hunterRaw, pastFailures] = await Promise.all([
      runWithTimeout(() => callOllama(input.userMessage, [
        { role: 'system', content: OPPORTUNITY_HUNTER_PROMPT },
        { role: 'user', content: `REQUEST: ${input.userMessage}` }
      ]), STAGE_TIMEOUT_MS),
      executeRecallMemory(userId, 'venture_failure')
    ]);
    const hunter = safeParseProposal(hunterRaw, 'scout');

    const foragerRaw = await runWithTimeout(() => callOllama(input.userMessage, [
      { role: 'system', content: EVIDENCE_FORAGER_PROMPT },
      { role: 'user', content: `OPPORTUNITIES: ${hunter.output}\nPAST_FAILURES: ${pastFailures}` }
    ]), STAGE_TIMEOUT_MS);
    const forager = safeParseProposal(foragerRaw, 'architect');

    const minerRaw = await runWithTimeout(() => callOllama(input.userMessage, [
      { role: 'system', content: SIGNAL_MINER_PROMPT },
      { role: 'user', content: `EVIDENCE: ${forager.output}` }
    ]), STAGE_TIMEOUT_MS);
    const miner = safeParseProposal(minerRaw, 'scout');

    // --- GATE 1: EXPLORE CHECK ---
    const gate1 = await sentinel.evaluateStageTransition(
      { title: input.userMessage } as any, 
      'Explore', 
      [hunter, forager, miner]
    );
    if (gate1.verdict !== 'PASS') {
      return createKillSwitchVerdict(
        `[Sentinel] ${gate1.rollback_reason || 'Explore stage failed quality gate'}`,
        Date.now() - start
      );
    }

    // --- STAGE 2: COLLAPSE (Convergence) ---
    const cacheRaw = await runWithTimeout(() => callOllama(input.userMessage, [
      { role: 'system', content: PLAN_CACHE_KEEPER_PROMPT },
      { role: 'user', content: `EXPLORATION_DATA: ${miner.output}` }
    ]), STAGE_TIMEOUT_MS);
    const cache = safeParseProposal(cacheRaw, 'workflow_designer');

    const conductorRaw = await runWithTimeout(() => callOllama(input.userMessage, [
      { role: 'system', content: VENTURE_CONDUCTOR_PROMPT },
      { role: 'user', content: `SELECTED_DATA: ${cache.output}\nMAPPING: ${miner.output}` }
    ]), STAGE_TIMEOUT_MS);
    const conductor = safeParseProposal(conductorRaw, 'workflow_designer');

    // --- GATE 2: COLLAPSE CHECK ---
    const gate2 = await sentinel.evaluateStageTransition(
      { title: input.userMessage } as any, 
      'Collapse', 
      [cache, conductor]
    );
    if (gate2.verdict !== 'PASS') {
      return createKillSwitchVerdict(
        `[Sentinel] ${gate2.rollback_reason || 'Collapse stage failed quality gate'}`,
        Date.now() - start
      );
    }

    // --- STAGE 3: ATTACK (The Crucible) ---
    const advocateRaw = await runWithTimeout(() => callOllama(input.userMessage, [
      { role: 'system', content: DEVILS_ADVOCATE_PROMPT },
      { role: 'user', content: `VENTURE_PROPOSAL: ${conductor.output}` }
    ]), STAGE_TIMEOUT_MS);
    const advocate = safeParseProposal(advocateRaw, 'critic');

    const marketSimRaw = await runWithTimeout(() => callOllama(input.userMessage, [
      { role: 'system', content: MARKET_SIMULATOR_PROMPT },
      { role: 'user', content: `PROPOSAL: ${conductor.output}\nOBJECTIONS: ${advocate.output}` }
    ]), STAGE_TIMEOUT_MS);
    const marketSim = safeParseProposal(marketSimRaw, 'market_simulator');

    // --- GATE 3: ATTACK CHECK ---
    const gate3 = await sentinel.evaluateStageTransition(
      { title: input.userMessage } as any, 
      'Attack', 
      [advocate, marketSim]
    );
    if (gate3.verdict !== 'PASS') {
      return createKillSwitchVerdict(
        `[Sentinel] ${gate3.rollback_reason || 'Attack stage failed quality gate'}`,
        Date.now() - start
      );
    }

    // --- STAGE 4: BUILD (Triple Simulation) ---
    const buildSimRaw = await runWithTimeout(() => callOllama(input.userMessage, [
      { role: 'system', content: BUILD_SIMULATOR_PROMPT },
      { role: 'user', content: `PROPOSAL: ${conductor.output}\nMARKET_FEEDBACK: ${marketSim.output}` }
    ]), STAGE_TIMEOUT_MS);
    const buildSim = safeParseProposal(buildSimRaw, 'execution');

    const revSimRaw = await runWithTimeout(() => callOllama(input.userMessage, [
      { role: 'system', content: REVENUE_SIMULATOR_PROMPT },
      { role: 'user', content: `BUILD_PLAN: ${buildSim.output}` }
    ]), STAGE_TIMEOUT_MS);
    const revSim = safeParseProposal(revSimRaw, 'revenue_simulator');

    const architectRaw = await runWithTimeout(() => callOllama(input.userMessage, [
      { role: 'system', content: REVENUE_ARCHITECT_PROMPT },
      { role: 'user', content: `REVENUE_FORECAST: ${revSim.output}\nBUILD_SIM: ${buildSim.output}` }
    ]), STAGE_TIMEOUT_MS);
    const architect = safeParseProposal(architectRaw, 'architect');

    const affiliateRaw = await runWithTimeout(() => callOllama(input.userMessage, [
      { role: 'system', content: AFFILIATE_SCOUT_PROMPT },
      { role: 'user', content: `OFFER: ${architect.output}` }
    ]), STAGE_TIMEOUT_MS);
    const affiliate = safeParseProposal(affiliateRaw, 'scout');

    const distributionRaw = await runWithTimeout(() => callOllama(input.userMessage, [
      { role: 'system', content: DISTRIBUTION_STRATEGIST_PROMPT },
      { role: 'user', content: `OFFER: ${architect.output}\nAFFILIATES: ${affiliate.output}` }
    ]), STAGE_TIMEOUT_MS);
    const distribution = safeParseProposal(distributionRaw, 'distribution');

    // --- GATE 4: BUILD CHECK ---
    const gate4 = await sentinel.evaluateStageTransition(
      { title: input.userMessage } as any, 
      'Build', 
      [buildSim, revSim, architect, affiliate, distribution]
    );
    if (gate4.verdict !== 'PASS') {
      return createKillSwitchVerdict(
        `[Sentinel] ${gate4.rollback_reason || 'Build stage failed quality gate'}`,
        Date.now() - start
      );
    }

    // --- STAGE 5: SYNTHESIS (Final Consensus) ---
    const blacksmithRaw = await runWithTimeout(() => callOllama(input.userMessage, [
      { role: 'system', content: SPEC_BLACKSMITH_PROMPT },
      { role: 'user', content: `ALL_DATA: ${JSON.stringify({ conductor: conductor.output, attack: marketSim.output, build: architect.output, distribution: distribution.output })}` }
    ]), STAGE_TIMEOUT_MS);
    const blacksmith = safeParseProposal(blacksmithRaw, 'execution');

    const ceoRaw = await runWithTimeout(() => callOllama(input.userMessage, [
      { role: 'system', content: CEO_SYNTHESIZER_PROMPT },
      { role: 'user', content: `FINAL_SPEC: ${blacksmith.output}\nFULL_TRACE_META: ${JSON.stringify({ stages: 5, agents: 14 })}` }
    ]), STAGE_TIMEOUT_MS);
    const ceo = safeParseProposal(ceoRaw, 'ceo');

    // --- PERSISTENCE: FAILURE ARCHIVIST ---
    if (ceo.verdict === 'reject' || advocate.confidence > 0.85) {
      const archivistRaw = await callOllama(input.userMessage, [
        { role: 'system', content: FAILURE_ARCHIVIST_PROMPT },
        { role: 'user', content: `FAILED_VENTURE: ${conductor.output}\nREASON: ${ceo.reasoning_summary}` }
      ]);
      await executeSaveMemory(userId, archivistRaw, 'venture_failure');
    }

    return {
      final_answer: ceo.output,
      confidence: ceo.confidence,
      risk: ceo.risk,
      fallback_used: false,
      timed_out: false,
      latency_ms: Date.now() - start,
      disagreement: ceo.verdict === 'reject',
      planner: forager,
      critic: advocate,
      guardian: revSim,
      risk_flags: DEFAULT_FLAGS,
      is_venture_cycle: true,
      scout: hunter,
      architect,
      risk_manager: marketSim,
      execution: blacksmith,
      distribution,
      workflow_designer: conductor,
      creative_designer: architect,
      market_simulator: marketSim,
      revenue_simulator: revSim,
      ceo,
      fragility_map: ceo.metadata?.fragility_map || marketSim.metadata?.fragility_map || {}
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
