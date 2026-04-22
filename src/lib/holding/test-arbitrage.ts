import { FreelanceArbitrageSkill } from '../skills/freelance-arbitrage';
import { ticketEngine } from './ticket-engine';

/**
 * src/lib/holding/test-arbitrage.ts
 * Test script for Self-Executing Freelance Arbitrage Mechanism
 */

async function testArbitrage() {
  console.log('--- 🚀 Testing Freelance Arbitrage Mechanism ---');
  
  const skill = new FreelanceArbitrageSkill();
  
  // 1. Execute the full loop
  const result = await skill.execute();
  
  console.log('Execution Result:', result);

  if (result.success && result.ticketId) {
    // 2. Verify Ticket Creation
    const ticket = ticketEngine.getTicket(result.ticketId);
    console.log('--- ✅ Governance Ticket Created ---');
    console.log('Ticket Title:', ticket?.title);
    console.log('Ticket Status:', ticket?.status);
    console.log('Ticket Priority:', ticket?.priority);
    console.log('--- ---------------------------- ---');
  } else {
    console.error('❌ Execution failed:', result.reason);
  }
}

testArbitrage().catch(console.error);
