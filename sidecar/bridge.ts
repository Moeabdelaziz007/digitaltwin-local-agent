import { ScreenObserver } from './screen-observer';

/**
 * sidecar/bridge.ts
 * Communicates desktop context to the main MAS-ZERO agent.
 */

export class SidecarBridge {
  private static instance: SidecarBridge;
  private observer: ScreenObserver;

  private constructor() {
    this.observer = ScreenObserver.getInstance();
  }

  public static getInstance(): SidecarBridge {
    if (!SidecarBridge.instance) {
      SidecarBridge.instance = new SidecarBridge();
    }
    return SidecarBridge.instance;
  }

  /**
   * Periodically observe the desktop and send signals to the agent.
   */
  public async startObservationLoop(onSignal: (context: any) => void) {
    console.log('[SidecarBridge] Starting desktop observation loop...');
    
    setInterval(async () => {
      try {
        const context = await this.observer.observe();
        
        // Logic: Only send signal if something interesting is found
        if (context.screenText.toLowerCase().includes('error') || 
            context.screenText.toLowerCase().includes('failed')) {
          onSignal({
            type: 'PROACTIVE_HELP_NEEDED',
            context
          });
        }
      } catch (e) {
        console.warn('[SidecarBridge] Observation step failed.');
      }
    }, 30000); // Every 30 seconds
  }
}

export const sidecarBridge = SidecarBridge.getInstance();
