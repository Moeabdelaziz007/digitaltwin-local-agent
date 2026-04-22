/**
 * src/lib/topology-router.ts
 * Quantum Topology Router: Manages lazy-loading of modules based on tier-aware dynamic imports.
 * Features: Module Caching, Robust Error Handling, and Tiered Resolution.
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

// Singleton protection for Next.js hot reloads to prevent redundant module loading
const globalForTopology = globalThis as unknown as {
  moduleCache: Map<string, any> | undefined;
};

const moduleCache = globalForTopology.moduleCache ?? new Map<string, any>();

if (process.env.NODE_ENV !== 'production') globalForTopology.moduleCache = moduleCache;

/**
 * Resolves a capability or skill by dynamically importing the required module.
 * @param capability The identifier for the required system capability or skill.
 * @throws Error if capability resolution fails or module cannot be loaded.
 */
export async function resolveTopology(capability: string): Promise<any> {
  // 1. Check Cache First
  if (moduleCache.has(capability)) {
    return moduleCache.get(capability);
  }

  try {
    const loader = TOPOLOGY_MAP[capability];

    if (loader) {
      console.log(`[QuantumTopology] Loading Tiered Capability: ${capability}`);
      const module = await loader();
      moduleCache.set(capability, module);
      return module;
    }

    // Tier 3: Quantum / Dynamic Skills
    if (capability.startsWith('skill:')) {
      const skillName = capability.replace('skill:', '');
      console.log(`[QuantumTopology] Loading Dynamic Skill: ${skillName}`);
      
      try {
        const module = await import(`./skills/${skillName}`);
        moduleCache.set(capability, module);
        return module;
      } catch (skillErr: any) {
        throw new Error(`[QuantumTopology] Failed to load dynamic skill "${skillName}": ${skillErr.message}`);
      }
    }

    throw new Error(`[QuantumTopology] Unknown capability: ${capability}`);
  } catch (err: any) {
    console.error(`[QuantumTopology] Error resolving "${capability}":`, err.message);
    
    // Detailed Error Reporting
    const enhancedError = new Error(`Topology Resolution Failed: ${capability}`);
    (enhancedError as any).context = {
      capability,
      timestamp: new Date().toISOString(),
      originalError: err.message
    };
    
    throw enhancedError;
  }
}

/**
 * Clears the topology cache. Useful for hot-reloading or memory management.
 */
export function clearTopologyCache() {
  console.log('[QuantumTopology] Clearing Module Cache');
  moduleCache.clear();
}
