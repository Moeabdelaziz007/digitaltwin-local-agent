import { env } from '@/lib/env';
import { callOllama } from '@/lib/ollama-client';
import { obs } from '@/lib/observability/observability-service';
import { 
  ConsensusInput, 
  ConsensusVerdict, 
  AgentProposal, 
  RiskFlags,
  AgentOutput,
  VentureStage
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
  FAILURE_ARCHIVIST_PROMPT,
  PRIVACY_FILTER_PROMPT,
  FUTURE_MIRROR_PROMPT,
  NEURAL_HIERARCHY_PROMPT
} from './prompts';
import { executeSaveMemory, executeRecallMemory } from '@/lib/memory-engine';
import { VentureSentinelAgent } from '../agents/profit-lab/venture-sentinel';
import { SynapseOracle } from '../agents/profit-lab/synapse-oracle';
import { ArbitrageAgent } from '../agents/profit-lab/arbitrage-agent';
import { opportunityScanner } from '../opportunity/scanner';
import { tieredMemory } from '../memory/tiered-store';
import { metaCognitive } from '../meta-cognitive/reflection-loop';
import { AutoLauncher, OpportunityCard } from '../opportunity/auto-launch';


import { ollamaBreaker } from './circuit-breaker';

const STAGE_TIMEOUT_MS = 12000;
const TOTAL_VENTURE_TIMEOUT_MS = 60000;

const DEFAULT_FLAGS: RiskFlags = {
  prompt_injection: false,
  hallucination_risk: false,
  privacy_leak_risk: false,
  policy_risk: false,
};

function safeParseProposal(raw: string, agent: string): AgentProposal {
  try {
    // 1. Strip Markdown code blocks if present
    const cleanRaw = raw.replace(/```json\n?|\n?```/g, '').trim();
    
    // 2. Extract JSON using a more robust regex if needed
    const jsonMatch = cleanRaw.match(/\{[\s\S]*\}/);
    const finalRaw = jsonMatch ? jsonMatch[0] : cleanRaw;
    
    const parsed = JSON.parse(finalRaw);
    return {
      agent: agent as any,
      verdict: parsed.verdict || 'accept',
      confidence: parsed.confidence || 0.5,
      risk: parsed.risk || 'med',
      output: parsed.output || (typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)),
      reasoning_summary: parsed.reasoning_summary || '',
      issues: parsed.issues || [],
      metadata: parsed
    };
  } catch (e) {
    console.warn(`[JSON-PARSE] Failed to parse ${agent} output, using raw text.`);
    return {
      agent: agent as any,
      verdict: 'revise',
      confidence: 0.1,
      risk: 'high',
      output: raw,
      reasoning_summary: 'Parse failed - raw fallback used',
      issues: ['invalid_json']
    };
  }
}

function toAgentOutput(proposal: AgentProposal, stage: VentureStage): AgentOutput {
  return {
    agentName: proposal.agent,
    stage,
    result: {
      output: proposal.output,
      confidence: proposal.confidence,
      risk: proposal.risk,
      issues: proposal.issues
    },
    timestamp: new Date().toISOString(),
    confidence: proposal.confidence
  };
}

const sentinel = new VentureSentinelAgent();
const oracle = new SynapseOracle();

export async function runConsensus(input: ConsensusInput): Promise<ConsensusVerdict> {
  const start = Date.now();
  const isVenture = input.userMessage.toLowerCase().includes('venture') || 
                    input.userMessage.toLowerCase().includes('profit') ||
                    input.userMessage.toLowerCase().includes('alpha') ||
                    input.userMessage.toLowerCase().includes('revenue') ||
                    input.userMessage.includes('[IDEA:]');

  if (isVenture) {
    return await runVentureLabCycle(input, start);
  }

  // Fallback to standard Planner loop
  const reply = await ollamaBreaker.execute(() => callOllama(input.userMessage, [
    { role: 'system', content: PLANNER_PROMPT },
    { role: 'user', content: input.userMessage }
  ]), '{"verdict": "revise", "output": "Service temporarily degraded"}');
  
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

async function runVentureLabCycle(input: ConsensusInput, start: number): Promise<ConsensusVerdict> {
  const userId = input.userId || 'system';
  
  return await obs.trace('venture_lab_v4.0_parallel_dag', {}, async (span) => {
    // --- STAGE 0: PRIVACY & SAFETY (SEQUENTIAL GATE) ---
    const privacyCheckRaw = await ollamaBreaker.execute(() => callOllama(input.userMessage, [
      { role: 'system', content: PRIVACY_FILTER_PROMPT },
      { role: 'user', content: `INPUT_TO_SCRUB: ${input.userMessage}` }
    ]), '{"output": "INPUT_SCRUBBED_FOR_SAFETY"}');
    
    const scrubbedInput = safeParseProposal(privacyCheckRaw, 'guardian').output;
    await tieredMemory.add(`Initiating venture cycle for: ${scrubbedInput}`, 'thought');

    // --- STAGE 1: EXPLORE (PARALLEL DISCOVERY) ---
    const [hunterRaw, pastFailures, oracleGems] = await Promise.all([
      ollamaBreaker.execute(() => callOllama(scrubbedInput, [
        { role: 'system', content: OPPORTUNITY_HUNTER_PROMPT },
        { role: 'user', content: `REQUEST: ${scrubbedInput}` }
      ]), ''),
      executeRecallMemory(userId, 'venture_failure'),
      oracle.detectEmergingOpportunities()
    ]);
    
    const hunter = safeParseProposal(hunterRaw, 'scout');
    if (oracleGems.length > 0) hunter.output += `\n\n[ORACLE_GEMS]: ${JSON.stringify(oracleGems)}`;

    const [foragerRaw, minerRaw] = await Promise.all([
      ollamaBreaker.execute(() => callOllama(scrubbedInput, [
        { role: 'system', content: EVIDENCE_FORAGER_PROMPT },
        { role: 'user', content: `OPPORTUNITIES: ${hunter.output}\nPAST_FAILURES: ${pastFailures}` }
      ]), ''),
      ollamaBreaker.execute(() => callOllama(scrubbedInput, [
        { role: 'system', content: SIGNAL_MINER_PROMPT },
        { role: 'user', content: `OPPORTUNITIES: ${hunter.output}` }
      ]), '')
    ]);
    
    const forager = safeParseProposal(foragerRaw, 'architect');
    const miner = safeParseProposal(minerRaw, 'scout');

    // GATE 1: THE PRISM CHECK
    const gate1 = await sentinel.evaluateStageTransition(
      { title: scrubbedInput, user_id: userId } as any, 
      'Explore', 
      [toAgentOutput(hunter, 'Explore'), toAgentOutput(forager, 'Explore'), toAgentOutput(miner, 'Explore')]
    );
    if (gate1.verdict !== 'PASS') return createKillSwitchVerdict(`[The Prism] ${gate1.rollback_reason}`, Date.now() - start);

    // --- STAGE 2: COLLAPSE (PLANNING) ---
    const [cacheRaw, conductorRaw] = await Promise.all([
      ollamaBreaker.execute(() => callOllama(scrubbedInput, [
        { role: 'system', content: PLAN_CACHE_KEEPER_PROMPT },
        { role: 'user', content: `EXPLORATION_DATA: ${miner.output}` }
      ]), ''),
      ollamaBreaker.execute(() => callOllama(scrubbedInput, [
        { role: 'system', content: VENTURE_CONDUCTOR_PROMPT },
        { role: 'user', content: `SELECTED_DATA: ${forager.output}\nMAPPING: ${miner.output}` }
      ]), '')
    ]);
    
    const cache = safeParseProposal(cacheRaw, 'workflow_designer');
    const conductor = safeParseProposal(conductorRaw, 'workflow_designer');

    const gate2 = await sentinel.evaluateStageTransition(
      { title: scrubbedInput, user_id: userId } as any, 
      'Collapse', 
      [toAgentOutput(cache, 'Collapse'), toAgentOutput(conductor, 'Collapse')]
    );
    if (gate2.verdict !== 'PASS') return createKillSwitchVerdict(`[The Synapse] ${gate2.rollback_reason}`, Date.now() - start);

    // --- STAGE 3: ATTACK (PARALLEL CHALLENGE) ---
    const [advocateRaw, marketSimRaw, futureMirrorRaw] = await Promise.all([
      ollamaBreaker.execute(() => callOllama(scrubbedInput, [
        { role: 'system', content: DEVILS_ADVOCATE_PROMPT },
        { role: 'user', content: `VENTURE_PROPOSAL: ${conductor.output}` }
      ]), ''),
      ollamaBreaker.execute(() => callOllama(scrubbedInput, [
        { role: 'system', content: MARKET_SIMULATOR_PROMPT },
        { role: 'user', content: `PROPOSAL: ${conductor.output}` }
      ]), ''),
      ollamaBreaker.execute(() => callOllama(scrubbedInput, [
        { role: 'system', content: FUTURE_MIRROR_PROMPT },
        { role: 'user', content: `PROPOSAL: ${conductor.output}` }
      ]), '')
    ]);
    
    const advocate = safeParseProposal(advocateRaw, 'critic');
    const marketSim = safeParseProposal(marketSimRaw, 'market_simulator');
    const futureMirror = safeParseProposal(futureMirrorRaw, 'market_simulator');

    const gate3 = await sentinel.evaluateStageTransition(
      { title: scrubbedInput, user_id: userId } as any, 
      'Attack', 
      [toAgentOutput(advocate, 'Attack'), toAgentOutput(marketSim, 'Attack'), toAgentOutput(futureMirror, 'Attack')]
    );
    if (gate3.verdict !== 'PASS') return createKillSwitchVerdict(`[The Crucible] ${gate3.rollback_reason}`, Date.now() - start);

    // --- STAGE 4: BUILD (PARALLEL EXECUTION SIM) ---
    const [buildSimRaw, revSimRaw, architectRaw, affiliateRaw, distributionRaw] = await Promise.all([
      ollamaBreaker.execute(() => callOllama(scrubbedInput, [
        { role: 'system', content: BUILD_SIMULATOR_PROMPT },
        { role: 'user', content: `PROPOSAL: ${conductor.output}\nMARKET_FEEDBACK: ${marketSim.output}` }
      ]), ''),
      ollamaBreaker.execute(() => callOllama(scrubbedInput, [
        { role: 'system', content: REVENUE_SIMULATOR_PROMPT },
        { role: 'user', content: `PROPOSAL: ${conductor.output}` }
      ]), ''),
      ollamaBreaker.execute(() => callOllama(scrubbedInput, [
        { role: 'system', content: REVENUE_ARCHITECT_PROMPT },
        { role: 'user', content: `PROPOSAL: ${conductor.output}` }
      ]), ''),
      ollamaBreaker.execute(() => callOllama(scrubbedInput, [
        { role: 'system', content: AFFILIATE_SCOUT_PROMPT },
        { role: 'user', content: `OFFER: ${conductor.output}` }
      ]), ''),
      ollamaBreaker.execute(() => callOllama(scrubbedInput, [
        { role: 'system', content: DISTRIBUTION_STRATEGIST_PROMPT },
        { role: 'user', content: `OFFER: ${conductor.output}` }
      ]), '')
    ]);

    const buildSim = safeParseProposal(buildSimRaw, 'execution');
    const revSim = safeParseProposal(revSimRaw, 'revenue_simulator');
    const architect = safeParseProposal(architectRaw, 'architect');
    const affiliate = safeParseProposal(affiliateRaw, 'scout');
    const distribution = safeParseProposal(distributionRaw, 'distribution');

    const gate4 = await sentinel.evaluateStageTransition(
      { title: scrubbedInput, user_id: userId } as any, 
      'Build', 
      [toAgentOutput(buildSim, 'Build'), toAgentOutput(revSim, 'Build'), toAgentOutput(architect, 'Build'), toAgentOutput(affiliate, 'Build'), toAgentOutput(distribution, 'Build')]
    );
    if (gate4.verdict !== 'PASS') return createKillSwitchVerdict(`[The Kinetic Edge] ${gate4.rollback_reason}`, Date.now() - start);

    // --- STAGE 5: SYNTHESIS ---
    const [blacksmithRaw, taskTreeRaw] = await Promise.all([
      ollamaBreaker.execute(() => callOllama(scrubbedInput, [
        { role: 'system', content: SPEC_BLACKSMITH_PROMPT },
        { role: 'user', content: `DATA: ${JSON.stringify({ conductor: conductor.output, build: architect.output })}` }
      ]), ''),
      ollamaBreaker.execute(() => callOllama(scrubbedInput, [
        { role: 'system', content: NEURAL_HIERARCHY_PROMPT },
        { role: 'user', content: `PROPOSAL: ${conductor.output}` }
      ]), '')
    ]);
    
    const blacksmith = safeParseProposal(blacksmithRaw, 'execution');
    const taskTree = safeParseProposal(taskTreeRaw, 'workflow_designer');

    const ceoRaw = await ollamaBreaker.execute(() => callOllama(scrubbedInput, [
      { role: 'system', content: CEO_SYNTHESIZER_PROMPT },
      { role: 'user', content: `FINAL_SPEC: ${blacksmith.output}\nTASK_TREE: ${taskTree.output}` }
    ]), '');
    const ceo = safeParseProposal(ceoRaw, 'ceo');

    // --- FINAL LOGIC ---
    if (ceo.verdict === 'reject') {
      await executeSaveMemory(userId, `Venture rejected: ${ceo.reasoning_summary}`, 'venture_failure');
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
      fragility_map: (ceo.metadata?.fragility_map || {}) as Record<string, number>
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
