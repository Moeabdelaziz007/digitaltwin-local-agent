/**
 * /src/lib/agents/sop-engine.ts
 * Standard Operating Procedure (SOP) Engine for Venture Lab.
 * Manages stateful multi-agent workflows with local LLM constraints.
 */

import { Opportunity, Venture } from '@/types/twin';

export type SOPStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SOPStep {
  id: string;
  name: string;
  description: string;
  agent: 'CEO' | 'Scout' | 'Strategist' | 'Builder';
  status: SOPStatus;
  output?: any;
  error?: string;
}

export interface SOPTask {
  id: string;
  sopName: string;
  steps: SOPStep[];
  context: Record<string, any>;
  status: SOPStatus;
  startedAt: string;
  completedAt?: string;
}

/**
 * The SOPEngine handles the execution and state persistence of agentic workflows.
 */
export class SOPEngine {
  private tasks: Map<string, SOPTask> = new Map();

  /**
   * Initialize a new SOP task. Can be static (template) or dynamic (MAS-ZERO self-designing).
   */
  createTask(sopName: string, initialContext: Record<string, any> = {}, isDynamic: boolean = false): SOPTask {
    const steps = isDynamic ? [] : this.getTemplateSteps(sopName);
    const task: SOPTask = {
      id: crypto.randomUUID(),
      sopName,
      steps,
      context: initialContext,
      status: isDynamic ? 'pending' : 'pending',
      startedAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  /**
   * MAS-ZERO: Self-Designing Agents
   * Allows a Meta-Agent to generate or refine the steps of a task on-the-fly.
   */
  async evolveSteps(taskId: string, generatedSteps: SOPStep[]): Promise<SOPTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found.`);

    // Merge or replace steps based on the meta-agent's design
    task.steps = [...task.steps, ...generatedSteps];
    console.log(`[SOP Engine] Evolved task ${taskId} with ${generatedSteps.length} new steps.`);
    
    return task;
  }

  /**
   * Get template steps for a specific SOP (Static Baseline).
   */
  private getTemplateSteps(sopName: string): SOPStep[] {
    switch (sopName) {
      case 'VentureValidation':
        return [
          { id: '1', name: 'MarketResearch', description: 'Scout for similar products and competitors', agent: 'Scout', status: 'pending' },
          { id: '2', name: 'TechnicalFeasibility', description: 'Check if we can build it for $0 locally', agent: 'Builder', status: 'pending' },
          { id: '3', name: 'CausalAnalysis', description: 'Evaluate profit causality and risks', agent: 'Strategist', status: 'pending' },
          { id: '4', name: 'ConsensusVerdict', description: 'Final review and user approval', agent: 'CEO', status: 'pending' },
        ];
      case 'CryptoArbitrage':
        return [
          { id: '1', name: 'MarketScan', description: 'Find price discrepancies across DEXs', agent: 'Scout', status: 'pending' },
          { id: '2', name: 'ProfitSimulation', description: 'Simulate flash loan and net profit', agent: 'Strategist', status: 'pending' },
          { id: '3', name: 'ExecutionGuard', description: 'Verify security and gas constraints', agent: 'Builder', status: 'pending' },
        ];
      default:
        // For dynamic tasks, we might not have a template
        return [];
    }
  }

  /**
   * Advances the SOP task to the next step.
   */
  async nextStep(taskId: string, stepOutput: any): Promise<SOPTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found.`);

    const currentStepIndex = task.steps.findIndex(s => s.status === 'pending' || s.status === 'running');
    if (currentStepIndex === -1) {
      // If no steps left, but task is pending, maybe it's waiting for evolution
      if (task.steps.length === 0) {
         console.warn(`[SOP Engine] Task ${taskId} has no steps. Waiting for MetaArchitect evolution.`);
         return task;
      }
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      return task;
    }

    const step = task.steps[currentStepIndex];
    step.status = 'completed';
    step.output = stepOutput;

    // Merge output into context for next steps
    task.context = { ...task.context, ...stepOutput };

    const nextStep = task.steps[currentStepIndex + 1];
    if (nextStep) {
      nextStep.status = 'pending';
    } else {
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
    }

    return task;
  }

  getTask(taskId: string): SOPTask | undefined {
    return this.tasks.get(taskId);
  }
}

// Export a singleton instance
export const sopEngine = new SOPEngine();
