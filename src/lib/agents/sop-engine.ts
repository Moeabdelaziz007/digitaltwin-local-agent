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
   * Initialize a new SOP task based on a predefined template.
   */
  createTask(sopName: string, initialContext: Record<string, any> = {}): SOPTask {
    const steps = this.getTemplateSteps(sopName);
    const task: SOPTask = {
      id: crypto.randomUUID(),
      sopName,
      steps,
      context: initialContext,
      status: 'pending',
      startedAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  /**
   * Get template steps for a specific SOP.
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
        throw new Error(`SOP Template "${sopName}" not found.`);
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
