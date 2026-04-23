import { FreelanceArbitrageV2Skill as FreelanceArbitrageSkill } from '../skills/freelance-arbitrage-v2';
import { TicketEngine } from './ticket-engine';
import { Venture, Role } from './types';

/**
 * src/lib/holding/test-arbitrage.ts
 * Test script for Self-Executing Freelance Arbitrage Mechanism
 */

async function testArbitrage() {
  console.log('--- 🚀 Testing Freelance Arbitrage Mechanism ---');
  
  const skill = new FreelanceArbitrageSkill();
  const venture: Venture = {
    id: 'v-arb-001',
    name: 'Arbitrage Venture',
    vision: 'Capture high-value freelance opportunities',
    mission_statement: 'Generate revenue through AI-assisted proposals',
    status: 'active',
    budget: {
      monthly_limit_usd: 1000,
      spent_this_month_usd: 0,
      token_limit: 1000000,
      spent_tokens: 0
    },
    org_chart: [],
    goals: [],
    created_at: new Date().toISOString(),
    metadata: {}
  };
  const role: Role = {
    id: 'role-rainmaker',
    title: 'Rainmaker',
    description: 'Find and close external revenue opportunities',
    assigned_agent_id: 'agent-rainmaker',
    department: 'revenue',
    capabilities: ['freelance-bidding'],
    budget_limit_per_task: 25
  };
  
  // 1. Execute the full loop
  const result = await skill.execute(venture, role);
  
  console.log('Execution Result:', result);

  if (result.success && result.ticketId) {
    // 2. Verify Ticket creation path references the engine
    const engineReady = typeof TicketEngine.createTicket === 'function';
    console.log('--- ✅ Governance Ticket Created ---');
    console.log('Ticket ID:', result.ticketId);
    console.log('Ticket Engine Ready:', engineReady);
    console.log('--- ---------------------------- ---');
  } else {
    console.error('❌ Execution failed:', result.error ?? result.output);
  }
}

testArbitrage().catch(console.error);
