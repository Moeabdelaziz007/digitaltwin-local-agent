/**
 * src/lib/topology-router.ts
 * Quantum Topology Router: Manages lazy-loading of modules based on tier-aware dynamic imports.
 */

const TOPOLOGY_MAP: Record<string, () => Promise<any>> = {
  // Tier 0: Core / Essential
  'core': () => import('./agents/profit-lab/skill-registry'),
  'guardian': () => import('./guardian/observability-guardian'),
  
  // Tier 1: Mid-weight / Frequent
  'memory': () => import('./memory-engine'),
  'opportunity': () => import('./opportunity/generator'),
  
  // Tier 2: Heavy / Task-Specific
  'voice': () => import('./voice/state-machine'),
  'causal': () => import('./causal/attribution'),
  'consensus': () => import('./consensus/orchestrator'),
  'meta': () => import('./meta-cognitive/reflection-loop'),
};

/**
 * Resolves a capability or skill by dynamically importing the required module.
 * @param capability The identifier for the required system capability or skill.
 */
export async function resolveTopology(capability: string): Promise<any> {
  const loader = TOPOLOGY_MAP[capability];

  if (loader) {
    console.log(`[QuantumTopology] Loading Tiered Capability: ${capability}`);
    return loader();
  }

  // Tier 3: Quantum / Dynamic Skills
  if (capability.startsWith('skill:')) {
    const skillName = capability.replace('skill:', '');
    console.log(`[QuantumTopology] Loading Dynamic Skill: ${skillName}`);
    return import(`./skills/${skillName}`);
  }

  throw new Error(`[QuantumTopology] Unknown capability: ${capability}`);
}
