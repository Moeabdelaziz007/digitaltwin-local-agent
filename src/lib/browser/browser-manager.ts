import { chromium, BrowserContext, Page } from 'playwright-core';

/**
 * MAS-ZERO Browser Manager — The Mirage Protocol
 * 
 * Strategy: Connect to an existing browser session to bypass anti-bot shields.
 * Requirements: Run Chrome with --remote-debugging-port=9222
 */
export class BrowserManager {
  private static instance: BrowserManager;
  private context: BrowserContext | null = null;

  private constructor() {}

  public static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  /**
   * Connects to a real browser instance via CDP
   */
  public async connect(): Promise<Page> {
    try {
      console.log('[Mirage] Attempting to sync with real human session on port 9222...');
      const browser = await chromium.connectOverCDP('http://localhost:9222');
      this.context = browser.contexts()[0];
      const pages = this.context.pages();
      return pages.length > 0 ? pages[0] : await this.context.newPage();
    } catch (e) {
      console.warn('[Mirage] Real session not found. Falling back to Stealth Headless (High Risk).');
      // Fallback logic could go here, but for now we enforce the 'Mirage' strategy
      throw new Error('Mirage Protocol requires an open browser with --remote-debugging-port=9222');
    }
  }

  /**
   * Human-like interaction: Randomized Scroll
   */
  public async humanScroll(page: Page) {
    const scrolls = Math.floor(Math.random() * 5) + 3;
    for (let i = 0; i < scrolls; i++) {
      const amount = Math.floor(Math.random() * 300) + 100;
      await page.mouse.wheel(0, amount);
      await page.waitForTimeout(Math.random() * 1000 + 500);
    }
  }

  /**
   * Human-like interaction: Natural Delay
   */
  public async wait(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

export const browserManager = BrowserManager.getInstance();
