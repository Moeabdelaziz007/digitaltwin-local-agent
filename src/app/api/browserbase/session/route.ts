import { NextResponse } from 'next/server';
import { Browserbase } from '@browserbasehq/sdk';

/**
 * Browserbase Session Manager
 * Creates and manages cloud browser sessions for web automation
 */

const bb = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY!,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, keepAlive, proxy } = body;

    // Create a new browser session
    const session = await bb.sessions.create({
      projectId: projectId || process.env.BROWSERBASE_PROJECT_ID!,
      keepAlive: keepAlive || false,
      proxies: proxy ? true : undefined,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      status: session.status,
      connectUrl: session.connectUrl,
      seleniumRemoteUrl: session.seleniumRemoteUrl,
    });
  } catch (error) {
    console.error('[BROWSERBASE] Failed to create session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create browser session' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  try {
    if (sessionId) {
      // Get specific session details
      const session = await bb.sessions.retrieve(sessionId);
      return NextResponse.json({
        success: true,
        session,
      });
    } else {
      // List all sessions
      const sessions = await bb.sessions.list();
      return NextResponse.json({
        success: true,
        sessions,
      });
    }
  } catch (error) {
    console.error('[BROWSERBASE] Failed to retrieve session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Stop the session
    await bb.sessions.update(sessionId, {
      status: 'REQUEST_RELEASE',
    });

    return NextResponse.json({
      success: true,
      message: 'Session stopped',
    });
  } catch (error) {
    console.error('[BROWSERBASE] Failed to stop session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stop session' },
      { status: 500 }
    );
  }
}
