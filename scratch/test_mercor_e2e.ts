import { ventureRegistry } from '../src/lib/holding/venture-registry';
import { MercorBridgeSkill } from '../src/lib/skills/mercor-bridge';
import { TicketEngine } from '../src/lib/holding/ticket-engine';
import { quantumMirror } from '../src/lib/quantum-mirror';

async function runE2ETest() {
  console.log('--- STARTING MERCOR E2E REAL TEST ---');

  // 1. Launch a real-world venture in the registry
  console.log('[Test] Launching "AI Legal Analyst for SMBs" venture...');
  const venture = await ventureRegistry.launchEngine('LegalTech Analyst', 'Small Business Compliance');
  
  // Update metadata to trigger Mercor logic (Scaling stage + High Budget)
  ventureRegistry.updateVenture(venture.id, {
    metadata: { ...venture.metadata, stage: 'scaling', engine: 'Legal LLM' },
    budget: { monthly_limit_usd: 1500, total_spent_usd: 120 }
  });

  console.log(`[Test] Venture Created: ${venture.id} | Name: ${venture.name}`);

  // 2. Initialize the Mercor Skill
  const mercorSkill = new MercorBridgeSkill();

  // 3. Trigger Discovery -> Score -> Generate -> Ticket Flow
  console.log('[Test] Triggering Mercor 8-Step Flow...');
  const result = await mercorSkill.execute(venture, venture.org_chart[0]);

  if (result.success) {
    console.log('✅ TEST SUCCESSFUL');
    console.log(`Result Output: ${result.output}`);
    console.log(`Governance Ticket Created: ${result.ticketId}`);

    // Verify Ticket Content
    const ticket = await TicketEngine.getTicket(result.ticketId!);
    if (ticket) {
      console.log('--- Ticket Verification ---');
      console.log(`Title: ${ticket.title}`);
      console.log(`Status: ${ticket.status}`);
      console.log('Context Snippet:');
      console.log(ticket.context.substring(0, 200) + '...');
    }
  } else {
    console.error('❌ TEST FAILED');
    console.error(result.output);
  }

  console.log('--- E2E TEST COMPLETE ---');
}

runE2ETest().catch(console.error);
