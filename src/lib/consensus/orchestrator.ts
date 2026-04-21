import { env } from '@/lib/env';
import { callOllama } from '@/lib/ollama-client';
import { obs } from '@/lib/observability/observability-service';
import { 
  ConsensusInput, 
  ConsensusVerdict, 
  AgentProposal, 
  RiskFlags 
} from '@/types/twin';
import { PLANNER_PROMPT, CRITIC_PROMPT, RISK_PROMPT } from './prompts';

const CONSENSUS_TIMEOUT_MS = 6000; // Increased for local reliability
const CIRCUIT_BREAKER_MS = 12000;

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
    // Attempt to extract JSON if LLM included conversational filler
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

/**
 * runConsensus
 * Sequential multi-agent reasoning loop.
 */
export async function runConsensus(input: ConsensusInput): Promise<ConsensusVerdict> {
  const start = Date.now();

  // 1. A/B Check (or Force Enable)
  const isEnabled = env.CONSENSUS_MODE === 'true';
  if (!isEnabled) {
    const directReply = await callOllama(input.userMessage, [
      { role: 'system', content: input.memoryContext },
      { role: 'user', content: input.userMessage },
    ]);
    
    return createSimpleVerdict(directReply, Date.now() - start);
  }

  return await obs.trace('consensus_cycle', {
    attributes: { 'user_message': input.userMessage.slice(0, 50) }
  }, async (span) => {
    try {
      // Pass 1: Planner
      const plannerRaw = await runWithTimeout(() => callOllama(
        input.userMessage,
        [
          { role: 'system', content: PLANNER_PROMPT },
          { role: 'system', content: `CONTEXT:\n${input.memoryContext}` },
          { role: 'user', content: input.userMessage },
        ]
      ), CONSENSUS_TIMEOUT_MS);
      const planner = safeParseProposal(plannerRaw, 'planner');

      // Pass 2: Critic
      const criticRaw = await runWithTimeout(() => callOllama(
        input.userMessage,
        [
          { role: 'system', content: CRITIC_PROMPT },
          { role: 'user', content: `PLANNER_PROPOSAL: ${JSON.stringify(planner)}` },
        ]
      ), CONSENSUS_TIMEOUT_MS);
      const critic = safeParseProposal(criticRaw, 'critic');

      // Pass 3: Guardian
      const guardianRaw = await runWithTimeout(() => callOllama(
        input.userMessage,
        [
          { role: 'system', content: RISK_PROMPT },
          { role: 'user', content: JSON.stringify({ 
            user: input.userMessage, 
            planner_output: planner.output, 
            critic_output: critic.output 
          }) },
        ]
      ), CONSENSUS_TIMEOUT_MS);
      
      const guardianParsed = JSON.parse(guardianRaw) as any;
      const guardian = safeParseProposal(guardianRaw, 'guardian');
      const riskFlags: RiskFlags = guardianParsed.risk_flags || DEFAULT_FLAGS;

      // Final Synthesis
      const finalAnswer = guardian.verdict === 'reject' 
        ? (guardian.output || "I'm sorry, I can't discuss that for safety reasons.")
        : (critic.verdict === 'accept' ? critic.output : planner.output);

      const latency = Date.now() - start;
      const disagreement = planner.verdict !== critic.verdict;

      obs.recordConsensusStats?.({
        hallucinationFlagRate: riskFlags.hallucination_risk ? 1 : 0,
        averageConsensusLatencyMs: latency,
        disagreementRate: disagreement ? 1 : 0,
      });

      return {
        final_answer: finalAnswer,
        confidence: Math.min(planner.confidence, critic.confidence, guardian.confidence),
        risk: guardian.risk,
        fallback_used: false,
        timed_out: false,
        latency_ms: latency,
        disagreement,
        planner,
        critic,
        guardian,
        risk_flags: riskFlags,
      };

    } catch (error) {
      console.error('[CONSENSUS] Loop failed, falling back to single-pass:', error);
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
