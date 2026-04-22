import { Browserbase } from '@browserbasehq/sdk';
import { chromium } from 'playwright-core';

/**
 * BrowserbaseController
 * High-level wrapper for browser automation using Browserbase + Playwright
 */

export class BrowserbaseController {
  private bb: Browserbase;
  private projectId: string;

  constructor() {
    this.bb = new Browserbase({
      apiKey: process.env.BROWSERBASE_API_KEY!,
    });
    this.projectId = process.env.BROWSERBASE_PROJECT_ID!;
  }

  /**
   * Create a new browser session and connect with Playwright
   */
  async createSession(options?: {
    keepAlive?: boolean;
    proxy?: boolean;
  }) {
    const session = await this.bb.sessions.create({
      projectId: this.projectId,
      keepAlive: options?.keepAlive || false,
      proxies: options?.proxy ? true : undefined,
    });

    // Connect Playwright to the session
    const browser = await chromium.connectOverCDP(session.connectUrl!);
    const context = browser.contexts()[0];
    const page = context.pages()[0] || (await context.newPage());

    return {
      sessionId: session.id,
      browser,
      context,
      page,
      debugUrl: session.debugUrl,
    };
  }

  /**
   * Execute a browser automation task
   */
  async executeTask(
    taskFn: (page: any) => Promise<any>,
    options?: {
      url?: string;
      keepAlive?: boolean;
    }
  ) {
    const { sessionId, browser, page, debugUrl } = await this.createSession({
      keepAlive: options?.keepAlive,
    });

    try {
      // Navigate to URL if provided
      if (options?.url) {
        await page.goto(options.url, { waitUntil: 'networkidle' });
      }

      // Execute the task
      const result = await taskFn(page);

      return {
        success: true,
        sessionId,
        result,
        debugUrl,
      };
    } catch (error) {
      console.error('[BROWSERBASE] Task execution failed:', error);
      return {
        success: false,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        debugUrl,
      };
    } finally {
      // Close browser if not keeping alive
      if (!options?.keepAlive) {
        await browser.close();
      }
    }
  }

  /**
   * Take a screenshot of a webpage
   */
  async screenshot(url: string, options?: { fullPage?: boolean }) {
    return this.executeTask(async (page: any) => {
      await page.goto(url, { waitUntil: 'networkidle' });
      const screenshot = await page.screenshot({
        fullPage: options?.fullPage || false,
        type: 'png',
      });
      return screenshot.toString('base64');
    }, { url });
  }

  /**
   * Extract content from a webpage
   */
  async extractContent(url: string, selector?: string) {
    return this.executeTask(async (page: any) => {
      await page.goto(url, { waitUntil: 'networkidle' });
      
      if (selector) {
        return await page.$eval(selector, (el: any) => el.textContent);
      }
      
      return await page.evaluate(() => document.body.innerText);
    }, { url });
  }

  /**
   * Fill a form and submit
   */
  async submitForm(url: string, formData: Record<string, string>, submitSelector?: string) {
    return this.executeTask(async (page: any) => {
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // Fill form fields
      for (const [selector, value] of Object.entries(formData)) {
        await page.fill(selector, value);
      }
      
      // Click submit button
      const submitBtn = submitSelector || 'button[type="submit"]';
      await page.click(submitBtn);
      await page.waitForNavigation({ waitUntil: 'networkidle' });
      
      return page.url();
    }, { url });
  }

  /**
   * Stop a browser session
   */
  async stopSession(sessionId: string) {
    try {
      await this.bb.sessions.stop(sessionId);
      return { success: true };
    } catch (error) {
      console.error('[BROWSERBASE] Failed to stop session:', error);
      return { success: false, error };
    }
  }

  /**
   * List all active sessions
   */
  async listSessions() {
    return await this.bb.sessions.list();
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string) {
    return await this.bb.sessions.retrieve(sessionId);
  }
}

// Export singleton instance
export const browserbase = new BrowserbaseController();
