import { NextResponse } from 'next/server';
import { ventureRegistry } from '@/lib/holding/venture-registry';
import { tieredMemory } from '@/lib/memory/tiered-store';
import { BudgetMonitor } from '@/lib/holding/budget-monitor';

export async function GET() {
  try {
    const ventures = ventureRegistry.listVentures();
    const hotMemory = tieredMemory.getHotContext();
    
    // Aggregate stats
    const stats = ventures.map(v => ({
      id: v.id,
      name: v.name,
      status: v.status,
      health: Math.floor(Math.random() * 20) + 80, // Simulated health for now
      budget: v.budget,
      recentActivity: hotMemory
        .filter(m => m.content.includes(v.name))
        .slice(-3)
    }));

    const totalSpent = ventures.reduce((acc, v) => acc + v.budget.spent_this_month_usd, 0);
    const totalTokens = ventures.reduce((acc, v) => acc + v.budget.spent_tokens, 0);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      global: {
        totalVentures: ventures.length,
        activeVentures: ventures.filter(v => v.status === 'active').length,
        totalSpent,
        totalTokens,
        heartbeatStatus: 'healthy'
      },
      ventures: stats
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch heartbeat stats' }, { status: 500 });
  }
}
