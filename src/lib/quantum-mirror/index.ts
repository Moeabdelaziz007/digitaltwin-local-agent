/**
 * src/lib/quantum-mirror/index.ts
 * Quantum Mirror Engine — نقطة الدخول الرئيسية
 */

// Types
export * from './types/mirror-types';

// Core Engine
export { QuantumMirrorEngine, quantumMirror } from './core/quantum-engine';

// Feedback
export { FeedbackForge, feedbackForge } from './feedback/feedback-forge';

// WorkforceTree helpers
import { workforceTree } from '../holding/workforce-tree';
import { MirrorPersonaVariant, SimulationConfig, DEFAULT_SIMULATION_CONFIG } from './types/mirror-types';

export async function spawnMirrorsForAgent(
  parentAgentId: string,
  count: number = 30,
  config: Partial<SimulationConfig> = {}
): Promise<string[]> {
  const fullConfig = { ...DEFAULT_SIMULATION_CONFIG, ...config };
  const mirrorIds: string[] = [];
  const variants: MirrorPersonaVariant[] = ['bull', 'bear', 'chaos', 'conservative', 'aggressive'];

  for (let i = 0; i < count; i++) {
    const mirror = await workforceTree.hireMirror(parentAgentId, {
      personaVariant: variants[i % variants.length],
      simulationDepth: fullConfig.simulationDepthDays,
      model: fullConfig.mirrorModel,
      temperature: fullConfig.temperature,
    });
    mirrorIds.push(mirror.id);
  }

  return mirrorIds;
}

export async function terminateMirrorsForAgent(parentAgentId: string): Promise<void> {
  const mirrors = workforceTree.listMirrors(parentAgentId);
  await Promise.allSettled(mirrors.map((m: any) => workforceTree.terminateMirror(m.id)));
}

export function getPromotionCandidates(minScore = 0.7) {
  return workforceTree.getPromotionCandidates(minScore);
}
