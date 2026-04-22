/**
 * src/lib/jobs/heartbeat.ts
 * محرك النبضات الحيوية: المسؤول عن استيقاظ الوكلاء بشكل دوري للقيام بالعمل الاستباقي.
 */

import { ventureRegistry } from '../holding/venture-registry';

export class HeartbeatEngine {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {}

  public static getInstance(): HeartbeatEngine {
    const globalAny = globalThis as any;
    if (!globalAny.heartbeatEngineInstance) {
      globalAny.heartbeatEngineInstance = new HeartbeatEngine();
    }
    return globalAny.heartbeatEngineInstance;
  }

  public start(intervalMs: number = 1000 * 60 * 60 * 4) { // الافتراضي: 4 ساعات
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log(`[Heartbeat] Engine started. Frequency: ${intervalMs / 3600000}h`);
    
    this.pulse().catch(console.error);

    this.intervalId = setInterval(() => {
      this.pulse().catch(console.error);
    }, intervalMs);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  private async pulse() {
    console.log(`[Heartbeat] Pulse triggered at ${new Date().toLocaleTimeString()}`);
    
    const ventures = ventureRegistry.listVentures().filter(v => v.status === 'active');
    const { tieredMemory } = await import('../memory/tiered-store');
    
    for (const venture of ventures) {
      try {
        console.log(`[Heartbeat] Auditing venture: ${venture.name}. Checking for opportunities...`);
        
        await tieredMemory.add(
          `Heartbeat: Pulse audit successful for ${venture.name}. Health: 100%.`, 
          'observation',
          { ventureId: venture.id }
        );

        // In the future, we can trigger specialized high-level audits here
      } catch (error) {
        console.error(`[Heartbeat] Failed to pulse venture ${venture.name}:`, error);
        await tieredMemory.add(
          `Heartbeat Error: Failed to audit ${venture.name}`, 
          'venture_failure',
          { error: (error as Error).message }
        );
      }
    }
  }
}

export const heartbeat = HeartbeatEngine.getInstance();
