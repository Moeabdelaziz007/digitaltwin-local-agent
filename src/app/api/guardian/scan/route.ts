import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { guardian } from '@/lib/guardian/observability-guardian';
import { env } from '@/lib/env';

/**
 * GET /api/guardian/scan
 * Triggers a real-world system audit.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    // Strict Admin Shield
    if (!userId || !env.ADMIN_USER_ID || userId !== env.ADMIN_USER_ID) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const report = await guardian.performFullScan();

    return NextResponse.json({
      success: true,
      report,
    });

  } catch (error) {
    console.error('[GUARDIAN_API] Scan failed:', error);
    return NextResponse.json({ error: 'Guardian audit failed' }, { status: 500 });
  }
}
