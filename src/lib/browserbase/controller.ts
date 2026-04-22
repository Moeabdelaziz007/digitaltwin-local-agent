import { Browserbase } from '@browserbasehq/sdk';

/**
 * BrowserbaseController
 * High-level wrapper for browser automation using Browserbase REST API (no Playwright binary)
 */

export class BrowserbaseController {
  private bb: Browserbase | null = null;
  private projectId: string | null = null;

  constructor() {
    // Lazy initialization to avoid build-time crashes when env vars are injected only at runtime.
  }

  private getClient(): Browserbase {
    if (!this.bb) {
      const apiKey = process.env.BROWSERBASE_API_KEY;
      if (!apiKey) {
        throw new Error('BROWSERBASE_API_KEY is missing');
      }
      this.bb = new Browserbase({ apiKey });
    }
    return this.bb;
  }

  private getProjectId(): string {
    if (!this.projectId) {
      const projectId = process.env.BROWSERBASE_PROJECT_ID;
      if (!projectId) {
        throw new Error('BROWSERBASE_PROJECT_ID is missing');
      }
      this.projectId = projectId;
    }
    return this.projectId;
  }

  /**
   * Create a new browser session using REST API
   */
  async createSession(options?: {
    keepAlive?: boolean;
    proxy?: boolean;
  }) {
    const bb = this.getClient();
    const session = await bb.sessions.create({
      projectId: this.getProjectId(),
      keepAlive: options?.keepAlive || false,
      proxies: options?.proxy ? true : undefined,
    });

    return {
      sessionId: session.id,
      connectUrl: (session as any).connectUrl,
      debugUrl: (session as any).debugUrl,
    };
  }

  /**
   * Execute a browser automation task using REST API
   */
  async executeTask(
    taskFn: (sessionId: string) => Promise<any>,
    options?: {
      keepAlive?: boolean;
    }
  ) {
    const { sessionId, debugUrl } = await this.createSession({
      keepAlive: options?.keepAlive,
    });

    try {
      // Execute the task using REST API
      const result = await taskFn(sessionId);

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
      // Stop session if not keeping alive
      if (!options?.keepAlive) {
        await this.stopSession(sessionId);
      }
    }
  }

  /**
   * Take a screenshot of a webpage using REST API
   */
  async screenshot(url: string, options?: { fullPage?: boolean }) {
    return this.executeTask(async (sessionId: string) => {
      // Use Browserbase REST API for screenshot
      const response = await (this.getClient().sessions as any).screenshot(sessionId, {
        url,
        fullPage: options?.fullPage || false,
        type: 'png',
      });
      return response.screenshot;
    }, { keepAlive: false });
  }

  /**
   * Extract content from a webpage using REST API
   */
  async extractContent(url: string, selector?: string) {
    return this.executeTask(async (sessionId: string) => {
      // Use Browserbase REST API for content extraction
      const response = await (this.getClient().sessions as any).evaluate(sessionId, {
        url,
        script: selector 
          ? `document.querySelector('${selector}')?.textContent || ''`
          : 'document.body.innerText',
      });
      return response.result;
    }, { keepAlive: false });
  }

  /**
   * Fill a form and submit using REST API
   */
  async submitForm(url: string, formData: Record<string, string>, submitSelector?: string) {
    return this.executeTask(async (sessionId: string) => {
      // Use Browserbase REST API for form submission
      const script = `
        await page.goto('${url}');
        ${Object.entries(formData).map(([selector, value]) => 
          `await page.fill('${selector}', '${value}');`
        ).join('\n')}
        await page.click('${submitSelector || "button[type='submit']"}');
        await page.waitForNavigation();
        return page.url();
      `;
      
      const response = await (this.getClient().sessions as any).evaluate(sessionId, {
        url,
        script,
      });
      return response.result;
    }, { keepAlive: false });
  }

  /**
   * Stop a browser session
   */
  async stopSession(sessionId: string) {
    try {
      // Request session release to end it sooner
      await (this.getClient().sessions as any).update(sessionId, {
        status: 'REQUEST_RELEASE',
      });
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
    return await this.getClient().sessions.list();
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string) {
    return await this.getClient().sessions.retrieve(sessionId);
  }
}

// Export singleton instance
export const browserbase = new BrowserbaseController();
