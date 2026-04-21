import { callOllama } from '@/lib/ollama-client';
import { obs } from '@/lib/observability/observability-service';
import type {
  AgentProposal,
  ConsensusInput,
  ConsensusVerdict,
  RiskFlags,
} from '@/types/twin';
import { env } from '@/lib/env';
import { CRITIC_PROMPT } from './prompts/critic';
import { PLANNER_PROMPT } from './prompts/planner';
import { RISK_PROMPT } from './prompts/risk';

const CONSENSUS_TIMEOUT_MS = 4500;
const CIRCUIT_BREAKER_MS = 9000;
const MAX_BUDGET = {
  planner: 900,
  critic: 700,
  guardian: 700,
};

const DEFAULT_FLAGS: RiskFlags = {
  prompt_injection: false,
  hallucination_risk: false,
  privacy_leak_risk: false,
  policy_risk: false,
};

const asProposal = (agent: AgentProposal['agent']): AgentProposal => ({
  agent,
  verdict: 'revise',
  confidence: 0.4,
  risk: 'med',
  output: 'I need to be more careful before answering.',
  reasoning_summary: 'Fallback proposal generated due to parser/timeout failure.',
  issues: ['fallback_triggered'],
});

async function runWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('timeout')), timeoutMs);
  });

  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle!);
  }
}

function safeParseProposal(raw: string, agent: AgentProposal['agent']): AgentProposal {
  try {
    const parsed = JSON.parse(raw) as Partial<AgentProposal> & { risk_flags?: RiskFlags };
    return {
      agent,
      verdict: parsed.verdict === 'accept' || parsed.verdict === 'reject' ? parsed.verdict : 'revise',
      confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
      risk: parsed.risk === 'low' || parsed.risk === 'high' ? parsed.risk : 'med',
      output: typeof parsed.output === 'string' ? parsed.output : '',
      reasoning_summary: typeof parsed.reasoning_summary === 'string' ? parsed.reasoning_summary : '',
      issues: Array.isArray(parsed.issues) ? parsed.issues.map(String) : [],
    };
  } catch {
    return asProposal(agent);
  }
}

function disagreementRate(planner: AgentProposal, critic: AgentProposal): number {
  return planner.verdict === critic.verdict ? 0 : 1;
}

function shouldRunConsensus(sessionId?: string): boolean {
  if (env.CONSENSUS_MODE !== 'true') return false;
  if (!sessionId) return true;

  let hash = 0;
  for (let i = 0; i < sessionId.length; i += 1) {
    hash = (hash * 31 + sessionId.charCodeAt(i)) % 100;
  }

  return hash < env.CONSENSUS_AB_PERCENT;
}

export async function runConsensus(input: ConsensusInput): Promise<ConsensusVerdict> {
  const start = Date.now();

  if (!shouldRunConsensus(input.sessionId)) {
    const fallback = await callOllama(input.userMessage, [
      { role: 'system', content: input.memoryContext },
      { role: 'user', content: input.userMessage },
    ]);

    const proposal = asProposal('planner');

    return {
      final_answer: fallback,
      confidence: 0.6,
      risk: 'med',
      fallback_used: true,
      timed_out: false,
      latency_ms: Date.now() - start,
      disagreement: false,
      planner: proposal,
      critic: asProposal('critic'),
      guardian: asProposal('guardian'),
      risk_flags: DEFAULT_FLAGS,
    };
  }

  return await obs.trace('consensus_orchestrator', {
    attributes: {
      'consensus.enabled': true,
      'consensus.ab_percent': env.CONSENSUS_AB_PERCENT,
    },
  }, async () => {
    let timedOut = false;
    let fallbackUsed = false;

    try {
      const plannerRaw = await runWithTimeout(() => callOllama(
        input.userMessage,
        [
          { role: 'system', content: `${PLANNER_PROMPT}\nMax token budget: ${MAX_BUDGET.planner}` },
          { role: 'system', content: input.memoryContext },
          { role: 'user', content: input.userMessage },
        ]
      ), CONSENSUS_TIMEOUT_MS);
      const planner = safeParseProposal(plannerRaw, 'planner');

      const criticRaw = await runWithTimeout(() => callOllama(
        input.userMessage,
        [
          { role: 'system', content: `${CRITIC_PROMPT}\nMax token budget: ${MAX_BUDGET.critic}` },
          { role: 'user', content: JSON.stringify(planner) },
        ]
      ), CONSENSUS_TIMEOUT_MS);
      const critic = safeParseProposal(criticRaw, 'critic');

      const guardianRaw = await runWithTimeout(() => callOllama(
        input.userMessage,
        [
          { role: 'system', content: `${RISK_PROMPT}\nMax token budget: ${MAX_BUDGET.guardian}` },
          { role: 'user', content: JSON.stringify({ planner, critic, user: input.userMessage }) },
        ]
      ), CONSENSUS_TIMEOUT_MS);

      const guardianParsed = JSON.parse(guardianRaw) as Partial<AgentProposal> & { risk_flags?: Partial<RiskFlags> };
      const guardian = safeParseProposal(JSON.stringify(guardianParsed), 'guardian');
      const riskFlags: RiskFlags = {
        prompt_injection: guardianParsed.risk_flags?.prompt_injection === true,
        hallucination_risk: guardianParsed.risk_flags?.hallucination_risk === true,
        privacy_leak_risk: guardianParsed.risk_flags?.privacy_leak_risk === true,
        policy_risk: guardianParsed.risk_flags?.policy_risk === true,
      };

      const finalAnswer = guardian.verdict === 'accept' && guardian.output
        ? guardian.output
        : critic.verdict === 'accept' && critic.output
          ? critic.output
          : planner.output || 'I need a moment to provide a safe answer.';

      const disagreement = disagreementRate(planner, critic) > 0;
      const latency = Date.now() - start;

      if (latency > CIRCUIT_BREAKER_MS) {
        fallbackUsed = true;
        const singlePass = await callOllama(input.userMessage, [
          { role: 'system', content: input.memoryContext },
          { role: 'user', content: input.userMessage },
        ]);
        obs.recordConsensusStats({
          hallucinationFlagRate: Number(riskFlags.hallucination_risk),
          averageConsensusLatencyMs: latency,
          disagreementRate: Number(disagreement),
        });

        return {
          final_answer: singlePass,
          confidence: 0.55,
          risk: 'med',
          fallback_used: true,
          timed_out: false,
          latency_ms: latency,
          disagreement,
          planner,
          critic,
          guardian,
          risk_flags: riskFlags,
        };
      }

      obs.recordConsensusStats({
        hallucinationFlagRate: Number(riskFlags.hallucination_risk),
        averageConsensusLatencyMs: latency,
        disagreementRate: Number(disagreement),
      });

      return {
        final_answer: finalAnswer,
        confidence: Math.max(planner.confidence, critic.confidence, guardian.confidence),
        risk: guardian.risk,
        fallback_used: fallbackUsed,
        timed_out: timedOut,
        latency_ms: latency,
        disagreement,
        planner,
        critic,
        guardian,
        risk_flags: riskFlags,
      };
    } catch {
      timedOut = true;
      fallbackUsed = true;
      const singlePass = await callOllama(input.userMessage, [
        { role: 'system', content: input.memoryContext },
        { role: 'user', content: input.userMessage },
      ]);
      const latency = Date.now() - start;
      const planner = asProposal('planner');
      const critic = asProposal('critic');
      const guardian = asProposal('guardian');
      obs.recordConsensusStats({
        hallucinationFlagRate: 0,
        averageConsensusLatencyMs: latency,
        disagreementRate: 0,
      });

      return {
        final_answer: singlePass,
        confidence: 0.5,
        risk: 'med',
        fallback_used: fallbackUsed,
        timed_out: timedOut,
        latency_ms: latency,
        disagreement: false,
        planner,
        critic,
        guardian,
        risk_flags: DEFAULT_FLAGS,
      };
    }
  });
}
