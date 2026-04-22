import { env } from '@/lib/env';
import { callOllama } from '@/lib/ollama-client';
import { obs } from '@/lib/observability/observability-service';
import { 
  ConsensusInput, 
  ConsensusVerdict, 
  AgentProposal, 
  RiskFlags,
  VentureStage
} from '@/types/twin';
import { 
  PRIVACY_FILTER_PROMPT,
  OPPORTUNITY_HUNTER_PROMPT,
  EVIDENCE_FORAGER_PROMPT,
  SIGNAL_MINER_PROMPT,
  VENTURE_CONDUCTOR_PROMPT,
  DEVILS_ADVOCATE_PROMPT,
  MARKET_SIMULATOR_PROMPT,
  REVENUE_ARCHITECT_PROMPT,
  SPEC_BLACKSMITH_PROMPT,
  CEO_SYNTHESIZER_PROMPT
} from './prompts';
import { executeSaveMemory, executeRecallMemory } from '@/lib/memory-engine';
import { ollamaBreaker } from './circuit-breaker';
import { groq } from '../groq-service';
import { tieredMemory } from '../memory/tiered-store';

const DEFAULT_FLAGS: RiskFlags = {
  prompt_injection: false,
  hallucination_risk: false,
  privacy_leak_risk: false,
  policy_risk: false,
};

/**
 * Robustly extracts the first valid JSON object from a potentially noisy string.
 */
function extractBalancedJSON(raw: string): any {
  const firstBrace = raw.indexOf('{');
  if (firstBrace === -1) return { output: raw };

  const lastBrace = raw.lastIndexOf('}');
  if (lastBrace === -1) return { output: raw };

  const candidate = raw.substring(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(candidate);
  } catch (e) {
    const clean = raw.replace(/```json\n?|\n?```/g, '').trim();
    const simpleMatch = clean.match(/\{[\s\S]*\}/);
    if (simpleMatch) return JSON.parse(simpleMatch[0]);
    return { output: raw };
  }
}

function safeParseProposal(raw: string, agent: string): AgentProposal {
  try {
    const parsed = extractBalancedJSON(raw);
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
  } catch (e: any) {
    return {
      agent: agent as any,
      verdict: 'revise',
      confidence: 0.1,
      risk: 'high',
      output: raw,
      reasoning_summary: `Parse failed: ${e.message}`,
      issues: ['invalid_json']
    };
  }
}

export async function runConsensus(input: ConsensusInput): Promise<ConsensusVerdict> {
  const start = Date.now();
  const isVenture = input.userMessage.toLowerCase().includes('venture') || 
                    input.userMessage.toLowerCase().includes('profit') ||
                    input.userMessage.includes('[IDEA:]');

  if (isVenture) {
    return await runVentureLabCycle(input, start);
  }

  // Standard Fallback
  const reply = await ollamaBreaker.execute(() => callOllama(input.userMessage, [
    { role: 'user', content: input.userMessage }
  ]), '{"output": "Service degraded"}');
  
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
  
  return await obs.trace('venture_lab_v4.2_ultra_parallel_dag', {}, async (span) => {
    // 0. Privacy Gate
    const privacyCheckRaw = await ollamaBreaker.execute(
      () => callOllama(input.userMessage, [{ role: 'system', content: PRIVACY_FILTER_PROMPT }, { role: 'user', content: `INPUT_TO_SCRUB: ${input.userMessage}` }]),
      () => groq.chatCompletion({ messages: [{ role: 'system', content: PRIVACY_FILTER_PROMPT }, { role: 'user', content: `INPUT_TO_SCRUB: ${input.userMessage}` }], model: 'llama-3.3-70b-versatile' })
    );
    const scrubbedInput = safeParseProposal(privacyCheckRaw, 'guardian').output;
    await tieredMemory.add(`Initiating Ultra-Parallel DAG for: ${scrubbedInput}`, 'thought');

    // --- DAG EXECUTION ---
    
    // Tier 1: Exploration
    const hunterPromise = ollamaBreaker.execute(() => callOllama(scrubbedInput, [{ role: 'system', content: OPPORTUNITY_HUNTER_PROMPT }, { role: 'user', content: `REQUEST: ${scrubbedInput}` }]), '');
    const foragerPromise = ollamaBreaker.execute(() => callOllama(scrubbedInput, [{ role: 'system', content: EVIDENCE_FORAGER_PROMPT }, { role: 'user', content: `REQUEST: ${scrubbedInput}` }]), '');
    const minerPromise = ollamaBreaker.execute(() => callOllama(scrubbedInput, [{ role: 'system', content: SIGNAL_MINER_PROMPT }, { role: 'user', content: `REQUEST: ${scrubbedInput}` }]), '');
    const pastFailuresPromise = executeRecallMemory(userId, 'venture_failure');

    // Tier 2: Planning (Depends on Forager & Miner)
    const runPlanning = async () => {
      const [foragerRaw, minerRaw, pastFailures] = await Promise.all([foragerPromise, minerPromise, pastFailuresPromise]);
      const forager = safeParseProposal(foragerRaw, 'architect');
      if (pastFailures) forager.output += `\n\n[PAST_FAILURES]: ${pastFailures}`;
      
      const conductorRaw = await ollamaBreaker.execute(() => callOllama(scrubbedInput, [{ role: 'system', content: VENTURE_CONDUCTOR_PROMPT }, { role: 'user', content: `DATA: ${forager.output}\nMAPPING: ${minerRaw}` }]), '');
      return safeParseProposal(conductorRaw, 'workflow_designer');
    };
    const conductorPromise = runPlanning();

    // Tier 3: Challenge (Depends on Conductor)
    const runChallenge = async () => {
      const conductor = await conductorPromise;
      return await Promise.all([
        ollamaBreaker.execute(() => callOllama(scrubbedInput, [{ role: 'system', content: DEVILS_ADVOCATE_PROMPT }, { role: 'user', content: `PROPOSAL: ${conductor.output}` }]), ''),
        ollamaBreaker.execute(() => callOllama(scrubbedInput, [{ role: 'system', content: MARKET_SIMULATOR_PROMPT }, { role: 'user', content: `PROPOSAL: ${conductor.output}` }]), ''),
        ollamaBreaker.execute(() => callOllama(scrubbedInput, [{ role: 'system', content: REVENUE_ARCHITECT_PROMPT }, { role: 'user', content: `PROPOSAL: ${conductor.output}` }]), '')
      ]);
    };
    const challengePromise = runChallenge();

    // Final Synthesis
    const [hunterRaw, conductor, challenges] = await Promise.all([hunterPromise, conductorPromise, challengePromise]);
    const hunter = safeParseProposal(hunterRaw, 'scout');
    const [advocateRaw, marketSimRaw, architectRaw] = challenges;
    
    const blacksmithRaw = await ollamaBreaker.execute(() => callOllama(scrubbedInput, [{ role: 'system', content: SPEC_BLACKSMITH_PROMPT }, { role: 'user', content: `SPEC: ${architectRaw}\nCONDUCTOR: ${conductor.output}` }]), '');
    const blacksmith = safeParseProposal(blacksmithRaw, 'execution');

    const ceoRaw = await ollamaBreaker.execute(() => callOllama(scrubbedInput, [{ role: 'system', content: CEO_SYNTHESIZER_PROMPT }, { role: 'user', content: `FINAL_SPEC: ${blacksmith.output}` }]), '');
    const ceo = safeParseProposal(ceoRaw, 'ceo');

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
      planner: conductor,
      critic: safeParseProposal(advocateRaw, 'critic'),
      guardian: safeParseProposal(marketSimRaw, 'market_simulator'),
      risk_flags: DEFAULT_FLAGS,
      is_venture_cycle: true,
      scout: hunter,
      architect: safeParseProposal(architectRaw, 'architect'),
      ceo,
      fragility_map: (ceo.metadata?.fragility_map || {}) as Record<string, number>
    };
  });
}
