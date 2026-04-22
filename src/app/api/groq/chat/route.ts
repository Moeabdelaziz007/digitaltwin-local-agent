import { NextResponse } from 'next/server';
import { groq } from '@/lib/groq-service';

/**
 * Groq AI API Endpoint
 * 
 * Usage:
 * POST /api/groq/chat
 * {
 *   "prompt": "Your question here",
 *   "model": "llama-3.3-70b-versatile", // optional
 *   "stream": false // optional
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, model = 'llama-3.3-70b-versatile', stream = false } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Check if Groq is available
    if (!groq.isAvailable()) {
      return NextResponse.json(
        { error: 'Groq service not configured - check GROQ_API_KEY' },
        { status: 503 }
      );
    }

    if (stream) {
      // For streaming, we'd need to use a different response approach
      // This is a simplified version
      const response = await groq.chatCompletion({
        messages: [
          { role: 'user', content: prompt },
        ],
        model,
        stream: false, // Simplified for now
      });

      return NextResponse.json({
        success: true,
        response,
        model,
        stream: false,
      });
    } else {
      const response = await groq.chatCompletion({
        messages: [
          { role: 'user', content: prompt },
        ],
        model,
      });

      return NextResponse.json({
        success: true,
        response,
        model,
      });
    }
  } catch (error) {
    console.error('[GROQ API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Quick test endpoint
 * GET /api/groq/test
 */
export async function GET() {
  try {
    if (!groq.isAvailable()) {
      return NextResponse.json({
        status: 'unavailable',
        message: 'Groq service not configured',
      });
    }

    const response = await groq.chatCompletion({
      messages: [
        { role: 'user', content: 'Say "Groq is working!" in one sentence.' },
      ],
      model: 'llama-3.3-70b-versatile',
      maxTokens: 50,
    });

    return NextResponse.json({
      status: 'available',
      message: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: String(error),
    });
  }
}
