/**
 * src/lib/jobs/heartbeat.ts
 * محرك النبضات الحيوية: المسؤول عن استيقاظ الوكلاء بشكل دوري للقيام بالعمل الاستباقي.
 */

import { ventureRegistry } from '../holding/venture-registry';
import { resolveTopology } from '../topology-router';
import { tieredMemory } from '../memory/tiered-store';

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

  /**
   * تشغيل المحرك بتردد معين (بالملي ثانية)
   */
  public start(intervalMs: number = 1000 * 60 * 60 * 4) { // الافتراضي: 4 ساعات
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log(`[Heartbeat] Engine started. Frequency: ${intervalMs / 3600000}h`);
    
    // تشغيل نبضة فورية عند البدء
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

  /**
   * منطق "النبضة" الواحدة
   */
  private async pulse() {
    console.log(`[Heartbeat] Pulse triggered at ${new Date().toLocaleTimeString()}`);
    
    const ventures = await ventureRegistry.getActiveVentures();
    
    for (const venture of ventures) {
      await tieredMemory.add(`Heartbeat: Auditing venture ${venture.name}`, 'thought');
      
      // 1. استدعاء المنسق (Orchestrator) لهذه الشركة
      try {
        const { resolveTopology } = await import('../topology-router');
        const orchestrator = await resolveTopology('consensus');
        
        // هنا نقوم بتشغيل دورة "Venture Lab" استباقية بناءً على الأهداف الحالية
        // ملاحظة: سنحتاج لتطوير Orchestrator ليقبل مدخلات من Heartbeat
        console.log(`[Heartbeat] Dispatching CEO for venture: ${venture.name}`);
      } catch (error) {
        console.error(`[Heartbeat] Failed to pulse venture ${venture.name}:`, error);
      }
    }
  }
}

export const heartbeat = HeartbeatEngine.getInstance();
