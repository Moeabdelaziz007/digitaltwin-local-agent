import { describe, it, expect, vi } from 'vitest';
import { ventureRegistry } from '../../holding/venture-registry';
import { MercorBridgeSkill } from '../mercor-bridge';
import { TicketEngine } from '../../holding/ticket-engine';

describe('MercorBridgeSkill E2E', () => {
  it('should complete the 8-step lifecycle for a real venture', async () => {
    console.log('--- STARTING VITEST MERCOR E2E ---');

    // 1. Setup
    const venture = await ventureRegistry.launchEngine('LegalTech', 'SMB Compliance');
    ventureRegistry.updateVenture(venture.id, {
      status: 'active',
      metadata: { ...venture.metadata, stage: 'scaling', engine: 'Compliance-Agent' },
      budget: { monthly_limit_usd: 2000, total_spent_usd: 0 }
    });

    const mercorSkill = new MercorBridgeSkill();
    const role = venture.org_chart[0];

    // 2. Execute
    const result = await mercorSkill.execute(venture, role);

    // 3. Assertions
    expect(result.success).toBe(true);
    expect(result.ticketId).toBeDefined();

    const ticket = await TicketEngine.getTicket(result.ticketId!);
    expect(ticket).toBeDefined();
    expect(ticket?.title).toContain('MERCOR');
    expect(ticket?.metadata.type).toBe('mercor_vouch');

    console.log('✅ Mercor E2E Test Passed with Ticket:', result.ticketId);
  }, 60000); // 60s timeout for LLM calls
});
