import { NextResponse } from 'next/server';
import { ventureRegistry } from '@/lib/holding/venture-registry';
import { MercorBridgeSkill } from '@/lib/skills/mercor-bridge';
import { TicketEngine } from '@/lib/holding/ticket-engine';

export async function GET() {
  try {
    console.log('[API TEST] Triggering Mercor E2E...');
    
    // 1. Create a real venture
    const venture = await ventureRegistry.launchEngine('LegalTech_E2E', 'Compliance');
    ventureRegistry.updateVenture(venture.id, {
      status: 'active',
      metadata: { ...venture.metadata, stage: 'scaling', engine: 'Compliance-Agent' },
      budget: { monthly_limit_usd: 5000, total_spent_usd: 0 }
    });

    const mercorSkill = new MercorBridgeSkill();
    const result = await mercorSkill.execute(venture, venture.org_chart[0]);

    if (!result.success) {
      return NextResponse.json({ success: false, output: result.output }, { status: 500 });
    }

    const ticket = await TicketEngine.getTicket(result.ticketId!);

    return NextResponse.json({
      success: true,
      ventureId: venture.id,
      ticket: {
        id: ticket?.id,
        title: ticket?.title,
        context: ticket?.context
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
