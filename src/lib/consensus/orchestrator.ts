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
  CRITIC_PROMPT, 
  RISK_PROMPT,
  ARCHITECT_PROMPT,
  SCOUT_PROMPT,
  VENTURE_RISK_PROMPT,
  EXECUTION_PROMPT,
  CEO_PROMPT
} from './prompts';

const CONSENSUS_TIMEOUT_MS = 8000; 
const VENTURE_TIMEOUT_MS = 20000; 

const DEFAULT_FLAGS: RiskFlags = {
  prompt_injection: false,
  hallucination_risk: false,
  privacy_leak_risk: false,
  policy_risk: false,
};

const createFallbackProposal = (agent: AgentProposal['agent'], reason: string): AgentProposal => ({
  agent,
  verdict: 'revise',
  confidence: 0.3,
  risk: 'med',
  output: 'System is under heavy load, providing direct response.',
  reasoning_summary: `Fallback triggered: ${reason}`,
  issues: ['fallback_triggered'],
});

async function runWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('CONSENSUS_TIMEOUT')), timeoutMs);
  });
  return await Promise.race([fn(), timeoutPromise]);
}

function safeParseProposal(raw: string, agent: AgentProposal['agent']): AgentProposal {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const cleanRaw = jsonMatch ? jsonMatch[0] : raw;
    
    const parsed = JSON.parse(cleanRaw) as Partial<AgentProposal>;
    return {
      agent,
      verdict: (parsed.verdict === 'accept' || parsed.verdict === 'reject' || parsed.verdict === 'revise') 
        ? parsed.verdict 
        : 'revise',
      confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
      risk: (parsed.risk === 'low' || parsed.risk === 'med' || parsed.risk === 'high') ? parsed.risk : 'med',
      output: typeof parsed.output === 'string' ? parsed.output : '',
      reasoning_summary: typeof parsed.reasoning_summary === 'string' ? parsed.reasoning_summary : '',
      issues: Array.isArray(parsed.issues) ? parsed.issues.map(String) : [],
    };
  } catch (error) {
    console.warn(`[CONSENSUS] Failed to parse ${agent} response:`, error);
    return createFallbackProposal(agent, 'parse_failure');
  }
}

function isVentureRequest(message: string): boolean {
  const keywords = ['venture', 'opportunity', 'market', 'profit', 'crypto alpha', 'launch', 'investment', 'business idea'];
  return keywords.some(k => message.toLowerCase().includes(k));
}

export async function runConsensus(input: ConsensusInput): Promise<ConsensusVerdict> {
  const start = Date.now();
  const isVenture = isVentureRequest(input.userMessage);

  const isEnabled = env.CONSENSUS_MODE === 'true';
  if (!isEnabled) {
    const directReply = await callOllama(input.userMessage, [
      { role: 'system', content: input.memoryContext },
      { role: 'user', content: input.userMessage },
    ]);
    return createSimpleVerdict(directReply, Date.now() - start);
  }

  return await obs.trace('consensus_cycle', {
    attributes: { 
      'user_message': input.userMessage.slice(0, 50),
      'mode': isVenture ? 'venture' : 'standard'
    }
  }, async (span) => {
    try {
      if (isVenture) {
        return await runVentureCycle(input, start);
      }
      return await runStandardCycle(input, start);
    } catch (error) {
      console.error('[CONSENSUS] Loop failed, falling back:', error);
      const directReply = await callOllama(input.userMessage, [
        { role: 'system', content: input.memoryContext },
        { role: 'user', content: input.userMessage },
      ]);
      
      return {
        ...createSimpleVerdict(directReply, Date.now() - start),
        fallback_used: true,
        timed_out: error instanceof Error && error.message === 'CONSENSUS_TIMEOUT',
      };
    }
  });
}

async function runStandardCycle(input: ConsensusInput, start: number): Promise<ConsensusVerdict> {
  const plannerRaw = await runWithTimeout(() => callOllama(
    input.userMessage,
    [{ role: 'system', content: PLANNER_PROMPT }, { role: 'system', content: `CONTEXT:\n${input.memoryContext}` }, { role: 'user', content: input.userMessage }]
  ), CONSENSUS_TIMEOUT_MS);
  const planner = safeParseProposal(plannerRaw, 'planner');

  const criticRaw = await runWithTimeout(() => callOllama(
    input.userMessage,
    [{ role: 'system', content: CRITIC_PROMPT }, { role: 'user', content: `PLANNER_PROPOSAL: ${JSON.stringify(planner)}` }]
  ), CONSENSUS_TIMEOUT_MS);
  const critic = safeParseProposal(criticRaw, 'critic');

  const guardianRaw = await runWithTimeout(() => callOllama(
    input.userMessage,
    [{ role: 'system', content: RISK_PROMPT }, { role: 'user', content: JSON.stringify({ user: input.userMessage, planner_output: planner.output, critic_output: critic.output }) }]
  ), CONSENSUS_TIMEOUT_MS);
  
  const guardianParsed = JSON.parse(guardianRaw) as any;
  const guardian = safeParseProposal(guardianRaw, 'guardian');
  const riskFlags: RiskFlags = guardianParsed.risk_flags || DEFAULT_FLAGS;

  const finalAnswer = guardian.verdict === 'reject' ? (guardian.output || "Safety reject.") : (critic.verdict === 'accept' ? critic.output : planner.output);
  const latency = Date.now() - start;

  return {
    final_answer: finalAnswer,
    confidence: Math.min(planner.confidence, critic.confidence, guardian.confidence),
    risk: guardian.risk,
    fallback_used: false,
    timed_out: false,
    latency_ms: latency,
    disagreement: planner.verdict !== critic.verdict,
    planner,
    critic,
    guardian,
    risk_flags: riskFlags,
    is_venture_cycle: false,
  };
}

async function runVentureCycle(input: ConsensusInput, start: number): Promise<ConsensusVerdict> {
  const isComplex = input.userMessage.length > 100 || input.userMessage.toLowerCase().includes('strategy');
  
  // 1. Meta-Architect: Design the workflow
  const archRaw = await runWithTimeout(() => callOllama(input.userMessage, [
    { role: 'system', content: ARCHITECT_PROMPT },
    { role: 'system', content: `CONTEXT:\n${input.memoryContext}` },
    { role: 'user', content: input.userMessage }
  ]), VENTURE_TIMEOUT_MS);
  const architect = safeParseProposal(archRaw, 'architect');

  // 2. Opportunity Scout: Market Signal Validation
  const scoutRaw = await runWithTimeout(() => callOllama(input.userMessage, [
    { role: 'system', content: SCOUT_PROMPT },
    { role: 'user', content: `ARCHITECT_PLAN: ${architect.output}\nGOAL: Find hidden gems and crypto alpha.` }
  ]), VENTURE_TIMEOUT_MS);
  const scout = safeParseProposal(scoutRaw, 'scout');

  // 3. Risk Manager: Causal Risk Audit
  const riskRaw = await runWithTimeout(() => callOllama(input.userMessage, [
    { role: 'system', content: VENTURE_RISK_PROMPT },
    { role: 'user', content: JSON.stringify({ plan: architect.output, signals: scout.output }) }
  ]), VENTURE_TIMEOUT_MS);
  const risk_manager = safeParseProposal(riskRaw, 'risk_manager');

  // 4. Execution: Tactical SOP
  const execRaw = await runWithTimeout(() => callOllama(input.userMessage, [
    { role: 'system', content: EXECUTION_PROMPT },
    { role: 'user', content: `PLAN: ${architect.output}\nSIGNALS: ${scout.output}\nRISK_FEEDBACK: ${risk_manager.output}` }
  ]), VENTURE_TIMEOUT_MS);
  const execution = safeParseProposal(execRaw, 'execution');

  // 5. CEO: Weighted Synthesis
  let ceoRaw = await runWithTimeout(() => callOllama(input.userMessage, [
    { role: 'system', content: CEO_PROMPT },
    { role: 'user', content: JSON.stringify({ architect, scout, risk_manager, execution }) }
  ]), VENTURE_TIMEOUT_MS);
  let ceo = safeParseProposal(ceoRaw, 'ceo');

  // META-REFINEMENT: If CEO rejects but with high confidence of "hidden potential", attempt 1 refinement
  if (ceo.verdict === 'reject' && ceo.confidence > 0.8 && isComplex) {
    console.log('[MAS-ZERO] CEO rejected with high confidence. Triggering Meta-Refinement...');
    const refinementRaw = await callOllama(input.userMessage, [
      { role: 'system', content: `You are the Meta-Critic. The CEO rejected the plan but saw potential. DESIGN A FIX for these issues: ${ceo.reasoning_summary}` },
      { role: 'user', content: JSON.stringify({ architect, scout, risk_manager, execution }) }
    ]);
    const refinement = safeParseProposal(refinementRaw, 'architect'); // Use architect role for refinement
    
    // Re-run CEO with refinement
    ceoRaw = await callOllama(input.userMessage, [
      { role: 'system', content: CEO_PROMPT },
      { role: 'user', content: JSON.stringify({ architect: refinement, scout, risk_manager, execution, refinement_note: "Original plan was refined based on CEO critique." }) }
    ]);
    ceo = safeParseProposal(ceoRaw, 'ceo');
  }

  const latency = Date.now() - start;

  return {
    final_answer: ceo.output,
    confidence: ceo.confidence,
    risk: ceo.risk,
    fallback_used: false,
    timed_out: false,
    latency_ms: latency,
    disagreement: false,
    planner: createSimpleProposal('planner', ceo.output),
    critic: createSimpleProposal('critic', ceo.output),
    guardian: createSimpleProposal('guardian', ceo.output),
    risk_flags: DEFAULT_FLAGS,
    architect,
    scout,
    risk_manager,
    execution,
    ceo,
    is_venture_cycle: true,
  };
}

function createSimpleProposal(agent: AgentProposal['agent'], output: string): AgentProposal {
  return {
    agent,
    verdict: 'accept',
    confidence: 1,
    risk: 'low',
    output,
    reasoning_summary: 'Synthesized via CEO',
    issues: []
  };
}

function createSimpleVerdict(reply: string, latency: number): ConsensusVerdict {
  const emptyProposal = (agent: AgentProposal['agent']): AgentProposal => ({
    agent, verdict: 'accept', confidence: 1, risk: 'low', output: '', reasoning_summary: 'Bypassed', issues: []
  });

  return {
    final_answer: reply,
    confidence: 0.8,
    risk: 'low',
    fallback_used: true,
    timed_out: false,
    latency_ms: latency,
    disagreement: false,
    planner: emptyProposal('planner'),
    critic: emptyProposal('critic'),
    guardian: emptyProposal('guardian'),
    risk_flags: DEFAULT_FLAGS,
  };
}
