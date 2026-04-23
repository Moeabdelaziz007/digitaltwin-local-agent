/**
 * src/lib/quantum-mirror/core/quantum-engine.ts
 * 
 * 🪞 Quantum Mirror Engine — المحرك الأساسي
 * 
 * يشغّل 30 محاكاة موازية بشخصيات مختلفة قبل أي تنفيذ حقيقي.
 * يضغط النتائج إلى "المسار الذهبي" الأكثر أماناً.
 */

import { callOllama } from '@/lib/ollama-client';
import { workforceTree } from '@/lib/holding/workforce-tree';
import { tieredMemory } from '@/lib/memory/tiered-store';
import { ollamaBreaker } from '@/lib/consensus/circuit-breaker';
import { JSONHardener } from '@/lib/utils/json-hardener';
import type { Venture } from '@/lib/holding/types';
import {
  MirrorPersonaVariant,
  SimulationResult,
  SimulationConfig,
  CompressedSimulation,
  DEFAULT_SIMULATION_CONFIG,
} from '../types/mirror-types';

// ─── Persona Prompts ──────────────────────────────────────────────────────────

const PERSONA_PROMPTS: Record<MirrorPersonaVariant, string> = {
  bull: `You are an OPTIMISTIC analyst. You believe in high growth and success.
Assume the best-case scenario. Identify maximum upside potential.
Be enthusiastic but grounded in realistic optimism.`,

  bear: `You are a PESSIMISTIC risk analyst. You expect things to go wrong.
Assume the worst-case scenario. Identify every possible failure point.
Be critical but constructive — your job is to prevent disasters.`,

  chaos: `You are a CHAOS analyst. You explore unexpected and edge-case scenarios.
Think about black swan events, market disruptions, and hidden variables.
Be creative and unconventional in your risk assessment.`,

  conservative: `You are a CONSERVATIVE strategist. You prioritize stability and low risk.
Recommend the safest possible approach. Avoid bold moves.
Your goal is capital preservation and steady, predictable growth.`,

  aggressive: `You are an AGGRESSIVE growth hacker. You seek maximum reward regardless of risk.
Recommend bold, high-risk high-reward strategies.
Your goal is explosive growth, even if it means higher failure probability.`,
};

// ─── Simulation Prompt Builder ────────────────────────────────────────────────

function buildSimulationPrompt(
  variant: MirrorPersonaVariant,
  parentAgentId: string,
  task: string,
  ventureName: string,
  simulationDepthDays: number
): string {
  return `
[SIMULATION MODE: ${variant.toUpperCase()}]
${PERSONA_PROMPTS[variant]}

You are simulating how agent "${parentAgentId}" would execute this task.

TASK: ${task}
VENTURE: ${ventureName}
SIMULATION HORIZON: ${simulationDepthDays} days

Simulate executing this task step-by-step from your ${variant} perspective.

Return ONLY valid JSON:
{
  "path": ["step 1", "step 2", "step 3"],
  "outcome": "success" | "failure" | "partial",
  "revenue": <number in USD>,
  "riskScore": <number 0-100>,
  "timeToCompletion": <number in days>,
  "confidence": <number 0.0-1.0>,
  "reasoning": "<brief explanation of your prediction>"
}
`.trim();
}

// ─── Quantum Mirror Engine ────────────────────────────────────────────────────

export class QuantumMirrorEngine {
  private static instance: QuantumMirrorEngine;
  private config: SimulationConfig;

  private constructor(config: Partial<SimulationConfig> = {}) {
    this.config = { ...DEFAULT_SIMULATION_CONFIG, ...config };
  }

  public static getInstance(config?: Partial<SimulationConfig>): QuantumMirrorEngine {
    if (!QuantumMirrorEngine.instance) {
      QuantumMirrorEngine.instance = new QuantumMirrorEngine(config);
    }
    return QuantumMirrorEngine.instance;
  }

  /**
   * 🚀 Main Entry Point
   * تشغيل المحاكاة الكاملة لمهمة معينة
   */
  public async simulate(
    parentAgentId: string,
    task: string,
    venture: Venture
  ): Promise<CompressedSimulation> {
    const start = Date.now();
    console.log(`[QuantumMirror] 🪞 Starting simulation for agent: ${parentAgentId}`);
    console.log(`[QuantumMirror] Task: ${task.slice(0, 80)}...`);

    // 1. توليد المرايا في WorkforceTree
    const mirrorIds = await this.spawnMirrors(parentAgentId);

    // 2. تشغيل المحاكيات بدفعات (لحماية Ollama)
    const results = await this.runBatchedSimulations(mirrorIds, task, venture);

    // 3. ضغط النتائج
    const compressed = this.compressResults(results);

    // 4. حفظ في الذاكرة
    await tieredMemory.add(
      `[QuantumMirror] Simulation for "${task.slice(0, 50)}" → ${compressed.recommendation} (${results.length} mirrors, ${Date.now() - start}ms)`,
      'thought'
    );

    // 5. إنهاء المرايا
    await this.terminateMirrors(mirrorIds);

    console.log(`[QuantumMirror] ✅ Done. Recommendation: ${compressed.recommendation} | Risk: ${compressed.expectedRisk.toFixed(0)} | Revenue: $${compressed.expectedRevenue.toFixed(0)}`);

    return compressed;
  }

  // ─── Private: Spawn Mirrors ─────────────────────────────────────────────────

  private async spawnMirrors(parentAgentId: string): Promise<string[]> {
    const variants: MirrorPersonaVariant[] = ['bull', 'bear', 'chaos', 'conservative', 'aggressive'];
    const mirrorIds: string[] = [];

    for (let i = 0; i < this.config.mirrorCount; i++) {
      const variant = variants[i % variants.length];
      try {
        const mirror = await workforceTree.hireMirror(parentAgentId, {
          personaVariant: variant,
          simulationDepth: this.config.simulationDepthDays,
          model: this.config.mirrorModel,
          temperature: this.config.temperature,
        });
        mirrorIds.push(mirror.id);
      } catch (e) {
        console.warn(`[QuantumMirror] Failed to spawn mirror ${i}: ${e}`);
      }
    }

    console.log(`[QuantumMirror] 🪞 Spawned ${mirrorIds.length}/${this.config.mirrorCount} mirrors`);
    return mirrorIds;
  }

  // ─── Private: Batched Simulations ──────────────────────────────────────────

  private async runBatchedSimulations(
    mirrorIds: string[],
    task: string,
    venture: Venture
  ): Promise<SimulationResult[]> {
    const results: SimulationResult[] = [];
    const { batchSize } = this.config;

    for (let i = 0; i < mirrorIds.length; i += batchSize) {
      const batch = mirrorIds.slice(i, i + batchSize);
      console.log(`[QuantumMirror] Running batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(mirrorIds.length / batchSize)} (${batch.length} mirrors)`);

      const batchResults = await Promise.allSettled(
        batch.map(mirrorId => this.runSingleSimulation(mirrorId, task, venture))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      }
    }

    return results;
  }

  // ─── Private: Single Simulation ────────────────────────────────────────────

  private async runSingleSimulation(
    mirrorId: string,
    task: string,
    venture: Venture
  ): Promise<SimulationResult> {
    const mirror = workforceTree.getNode(mirrorId);
    if (!mirror || !mirror.mirrorMeta) {
      throw new Error(`Mirror ${mirrorId} not found`);
    }

    const { personaVariant, model, simulationDepth } = mirror.mirrorMeta;

    const prompt = buildSimulationPrompt(
      personaVariant,
      mirror.mirrorMeta.parentRealAgentId,
      task,
      venture.name,
      simulationDepth
    );

    const raw = await ollamaBreaker.execute(
      () => callOllama(prompt, [
        { role: 'system', content: `You are a ${personaVariant} simulation agent. Return ONLY valid JSON.` },
        { role: 'user', content: prompt },
      ]),
      // Fallback إذا فشل Ollama
      JSON.stringify({
        path: ['fallback-step'],
        outcome: 'partial',
        revenue: 0,
        riskScore: 50,
        timeToCompletion: 30,
        confidence: 0.1,
        reasoning: 'Simulation failed - using fallback values',
      })
    );

    return this.parseSimulationResult(raw, mirrorId, personaVariant);
  }

  // ─── Private: Parse Result ──────────────────────────────────────────────────

  private parseSimulationResult(
    raw: string,
    mirrorId: string,
    variant: MirrorPersonaVariant
  ): SimulationResult {
    const parsed = JSONHardener.extract<any>(raw);

    return {
      mirrorId,
      path: Array.isArray(parsed.path) ? parsed.path : ['unknown'],
      outcome: ['success', 'failure', 'partial'].includes(parsed.outcome)
        ? parsed.outcome
        : 'partial',
      revenue: typeof parsed.revenue === 'number' ? parsed.revenue : 0,
      riskScore: typeof parsed.riskScore === 'number'
        ? Math.min(100, Math.max(0, parsed.riskScore))
        : 50,
      timeToCompletion: typeof parsed.timeToCompletion === 'number'
        ? parsed.timeToCompletion
        : 30,
      confidence: typeof parsed.confidence === 'number'
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.5,
      reasoning: typeof parsed.reasoning === 'string'
        ? parsed.reasoning
        : `${variant} simulation result`,
    };
  }

  // ─── Private: Compress Results ──────────────────────────────────────────────

  private compressResults(results: SimulationResult[]): CompressedSimulation {
    if (results.length === 0) {
      return {
        topPaths: [],
        expectedRevenue: 0,
        expectedRisk: 100,
        overallConfidence: 0,
        recommendation: 'abort',
        reasoning: 'No simulation results available.',
      };
    }

    // 1. فلترة النتائج عالية المخاطر
    const filtered = results.filter(r => r.riskScore < this.config.maxRiskScore);

    // 2. ترتيب بـ ROI score = revenue / (risk + 1)
    const sorted = filtered.sort(
      (a, b) => b.revenue / (b.riskScore + 1) - a.revenue / (a.riskScore + 1)
    );

    // 3. أفضل 5 مسارات
    const topPaths = sorted.slice(0, 5);

    // 4. حساب المتوسطات المرجحة
    const totalConfidence = results.reduce((s, r) => s + r.confidence, 0);
    const weightedRevenue = results.reduce((s, r) => s + r.revenue * r.confidence, 0);
    const weightedRisk = results.reduce((s, r) => s + r.riskScore * r.confidence, 0);
    const avgConfidence = totalConfidence / results.length;
    const expectedRevenue = totalConfidence > 0 ? weightedRevenue / totalConfidence : 0;
    const expectedRisk = totalConfidence > 0 ? weightedRisk / totalConfidence : 50;

    // 5. حساب نسبة النجاح
    const successCount = results.filter(r => r.outcome === 'success').length;
    const successRate = successCount / results.length;

    // 6. التوصية النهائية
    let recommendation: CompressedSimulation['recommendation'];
    let reasoning: string;

    if (successRate >= 0.6 && expectedRisk < 40) {
      recommendation = 'proceed';
      reasoning = `${Math.round(successRate * 100)}% of mirrors predict success with low risk (${expectedRisk.toFixed(0)}/100). Safe to proceed.`;
    } else if (successRate >= 0.4 || expectedRisk < 60) {
      recommendation = 'caution';
      reasoning = `Mixed signals: ${Math.round(successRate * 100)}% success rate, risk at ${expectedRisk.toFixed(0)}/100. Proceed with caution.`;
    } else {
      recommendation = 'abort';
      reasoning = `Only ${Math.round(successRate * 100)}% success rate with high risk (${expectedRisk.toFixed(0)}/100). Recommend aborting.`;
    }

    return {
      topPaths,
      expectedRevenue,
      expectedRisk,
      overallConfidence: avgConfidence,
      recommendation,
      reasoning,
    };
  }

  // ─── Private: Terminate Mirrors ────────────────────────────────────────────

  private async terminateMirrors(mirrorIds: string[]): Promise<void> {
    await Promise.allSettled(
      mirrorIds.map(id => workforceTree.terminateMirror(id).catch(() => {}))
    );
  }
}

export const quantumMirror = QuantumMirrorEngine.getInstance();
