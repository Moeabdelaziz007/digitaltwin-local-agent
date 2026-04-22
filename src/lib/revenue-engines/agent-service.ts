/**
 * src/lib/revenue-engines/agent-service.ts
 * محرك "الوكيل كخدمة" (Agent-as-a-Service Engine)
 */

import { WorkflowNode } from '../consensus/dag-executor';

export const AgentAsAServiceBlueprint = {
  name: 'Agent Provider',
  mission: 'Package specialized MAS-ZERO agents as accessible APIs for external clients.',
  
  getWorkflow(agentType: string): WorkflowNode[] {
    return [
      {
        id: 'configure_agent',
        agent: 'Architect',
        task: `Define the API schema and system prompt for the ${agentType} agent.`,
        dependencies: [],
        parallel: true
      },
      {
        id: 'setup_endpoint',
        agent: 'CTO',
        task: 'Create the Next.js API route and integrate authentication (API Keys).',
        dependencies: ['configure_agent'],
        parallel: false
      },
      {
        id: 'billing_logic',
        agent: 'Rainmaker',
        task: 'Set up Stripe usage-based billing logic for each API call.',
        dependencies: ['setup_endpoint'],
        parallel: false
      },
      {
        id: 'documentation',
        agent: 'CEO',
        task: 'Generate clear API documentation and examples for users.',
        dependencies: ['billing_logic'],
        parallel: true
      }
    ];
  }
};
