import { NextResponse } from 'next/server';
import { browserbase } from '@/lib/browserbase/controller';

/**
 * Example: Automated Market Research using Browserbase
 * This endpoint demonstrates how to use Browserbase for opportunity scouting
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, task } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Example: Extract product information from a webpage
    const result = await (browserbase as any).executeTask(
      async (page: any) => {
        await page.goto(url, { waitUntil: 'networkidle' });

        // Extract page title and meta description
        const title = await page.title();
        const metaDescription = await page.$eval(
          'meta[name="description"]',
          (el: any) => el?.content || ''
        ).catch(() => '');

        // Extract all links
        const links = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a'))
            .map(a => ({
              text: a.textContent?.trim(),
              href: a.href,
            }))
            .filter((link: any) => link.text && link.href.startsWith('http'))
            .slice(0, 20);
        });

        // Extract headings
        const headings = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('h1, h2, h3'))
            .map(h => ({
              level: h.tagName,
              text: h.textContent?.trim(),
            }));
        });

        return {
          title,
          metaDescription,
          links,
          headings,
          url: page.url(),
        };
      },
      { url } as any
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[BROWSERBASE] Market research failed:', error);
    return NextResponse.json(
      { error: 'Failed to execute market research' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // List all active sessions
    const sessions = await browserbase.listSessions();
    
    return NextResponse.json({
      success: true,
      sessions: sessions.map((s: any) => ({
        id: s.id,
        status: s.status,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    console.error('[BROWSERBASE] Failed to list sessions:', error);
    return NextResponse.json(
      { error: 'Failed to list sessions' },
      { status: 500 }
    );
  }
}
