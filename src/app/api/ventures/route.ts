import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ventureRegistry } from '@/lib/holding/venture-registry';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ventures = ventureRegistry.listVentures();
    return NextResponse.json({ 
      timestamp: new Date().toISOString(),
      ventures 
    });
  } catch (error) {
    console.error('[VENTURES_API] failed to list ventures', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
