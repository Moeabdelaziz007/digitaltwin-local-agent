import screenshot from 'screenshot-desktop';
import { createWorker } from 'tesseract.js';
import path from 'path';

/**
 * sidecar/screen-observer.ts
 * The "Eyes" of the Agent: Captures and OCRs the desktop for context-aware proactive help.
 */

export interface DesktopContext {
  activeApp: string;
  screenText: string;
  timestamp: number;
}

export class ScreenObserver {
  private static instance: ScreenObserver;
  private worker: any = null;

  private constructor() {}

  public static getInstance(): ScreenObserver {
    if (!ScreenObserver.instance) {
      ScreenObserver.instance = new ScreenObserver();
    }
    return ScreenObserver.instance;
  }

  private async getWorker() {
    if (!this.worker) {
      this.worker = await createWorker();
      await this.worker.loadLanguage('eng');
      await this.worker.initialize('eng');
    }
    return this.worker;
  }

  /**
   * Captures the screen and extracts text via OCR.
   */
  public async observe(): Promise<DesktopContext> {
    try {
      console.log('[Sidecar] Capturing desktop...');
      const img = await screenshot({ format: 'png' });
      
      const worker = await this.getWorker();
      const { data: { text } } = await worker.recognize(img);

      // Mocking activeApp for now (needs native OS bridge like node-active-window for real data)
      const activeApp = "User Environment"; 

      return {
        activeApp,
        screenText: text.substring(0, 1000), // Limit text to first 1000 chars for context efficiency
        timestamp: Date.now()
      };
    } catch (e) {
      console.error('[Sidecar] Observation failed:', e);
      throw e;
    }
  }

  public async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

// Usage Example (Stub)
if (require.main === module) {
  const observer = ScreenObserver.getInstance();
  observer.observe().then(context => {
    console.log('--- Desktop Context ---');
    console.log(`App: ${context.activeApp}`);
    console.log(`Text Found: ${context.screenText.substring(0, 100)}...`);
  });
}
