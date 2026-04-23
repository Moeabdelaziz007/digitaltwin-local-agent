import { callOllama } from '../ollama-client';
import { skillRegistry } from '../skills/registry';
import { quantumMirror } from '../quantum-mirror';
import { Venture } from '../holding/types';

/**
 * Evolutionary Memory: The Genetic Algorithm of Prompts
 * 
 * This system treats agent instructions as DNA that evolves 
 * through crossovers and mutations based on fitness (ROI/Success).
 */

export interface PromptDNA {
  id: string;
  skillId: string;
  systemInstructions: string;  // The Core Gene
  examples: string[];          // The Chromosomes
  constraints: string[];       // The Regulatory Mutations
  fitness: number;             // Survival Score (0.0 to 1.0)
  generation: number;
}

export class EvolutionEngine {
  private static instance: EvolutionEngine;
  
  private constructor() {}

  public static getInstance(): EvolutionEngine {
    if (!EvolutionEngine.instance) {
      EvolutionEngine.instance = new EvolutionEngine();
    }
    return EvolutionEngine.instance;
  }

  /**
   * Nightly Tournament: The survival of the fittest prompts.
   */
  public async runNightlyTournament(venture: Venture) {
    console.log('[Evolution] 🧬 Starting Nightly Prompt Tournament...');
    
    const skills = skillRegistry.getActiveSkills();
    const population: PromptDNA[] = skills.map(s => ({
      id: `DNA-${s.id || 'unnamed'}-${Date.now()}`,
      skillId: s.id || 'unnamed',
      systemInstructions: s.instructions || '',
      examples: s.metadata.invocation_flow || [],
      constraints: s.metadata.permissions || [],
      fitness: s.metadata.successRate || 0,
      generation: 1
    }));

    // 1. Selection: Find the Elite
    const elite = population.sort((a, b) => b.fitness - a.fitness).slice(0, 2);
    if (elite.length < 2) return;

    // 2. Crossover: Mate the two best prompts
    const childDNA = await this.crossover(elite[0], elite[1]);

    // 3. Mutation: Mutate the underperformers
    const mutants = await Promise.all(
      population
        .filter(p => p.fitness < 0.4)
        .map(p => this.mutate(p))
    );

    // 4. Tournament: Simulate performance using Quantum Mirror
    const candidates = [...elite, childDNA, ...mutants];
    const winner = await this.holdTournament(candidates, venture);

    // 5. Injection: Inject the superior DNA back into the skill registry
    if (winner) {
      console.log(`[Evolution] 🏆 Winner Decided: ${winner.skillId} (Gen: ${winner.generation})`);
      await this.injectDNA(winner);
    }
  }

  private async crossover(parentA: PromptDNA, parentB: PromptDNA): Promise<PromptDNA> {
    const prompt = `
      Parent A DNA: ${parentA.systemInstructions}
      Parent B DNA: ${parentB.systemInstructions}
      
      Combine the best strategies from both to create a SUPER-DNA instruction set.
      Keep it strictly technical and directive.
    `;
    const childInstructions = await callOllama(prompt);
    
    return {
      ...parentA,
      id: `DNA-CHILD-${Date.now()}`,
      systemInstructions: childInstructions,
      generation: parentA.generation + 1,
      fitness: 0 // Reset fitness for testing
    };
  }

  private async mutate(dna: PromptDNA): Promise<PromptDNA> {
    const prompt = `
      Current DNA: ${dna.systemInstructions}
      Perform a 'Radical Mutation'. Change the approach or tone significantly to try and break a failure loop.
    `;
    const mutatedInstructions = await callOllama(prompt);
    
    return {
      ...dna,
      id: `DNA-MUTANT-${Date.now()}`,
      systemInstructions: mutatedInstructions,
      fitness: 0
    };
  }

  private async holdTournament(candidates: PromptDNA[], venture: Venture): Promise<PromptDNA | null> {
    // We use Quantum Mirror to simulate which DNA performs best against a set of task scenarios
    const results = await Promise.all(candidates.map(async dna => {
      const simulation = await quantumMirror.simulate(venture, {
        id: 'tournament-bot',
        title: 'Evolution Tester',
        description: dna.systemInstructions,
        assigned_agent_id: dna.skillId,
        department: 'engineering',
        capabilities: dna.constraints,
        budget_limit_per_task: 10
      });
      return { dna, score: simulation.weightedScore };
    }));

    return results.sort((a, b) => b.score - a.score)[0]?.dna || null;
  }

  private async injectDNA(winner: PromptDNA) {
    const skill = skillRegistry.getSkill(winner.skillId);
    if (skill && skill.instance) {
      // Update instructions in the instance and the registry record
      skill.instance.instructions = winner.systemInstructions;
      skill.instructions = winner.systemInstructions;
      
      console.log(`[Evolution] 💉 DNA Injected into ${winner.skillId}. System Evolved.`);
    }
  }
}

export const evolutionEngine = EvolutionEngine.getInstance();
