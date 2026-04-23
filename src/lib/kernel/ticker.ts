import { ventureRegistry } from '../holding/venture-registry';
import { kernel } from './core-kernel';
import { TicketEngine } from '../holding/ticket-engine';
import { skillRegistry } from '../skills/registry';

/**
 * Venture Ticker (The Heartbeat)
 * Periodically triggers autonomous tasks via the CoreKernel.
 */
export class VentureTicker {
  private static instance: VentureTicker;
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): VentureTicker {
    if (!VentureTicker.instance) {
      VentureTicker.instance = new VentureTicker();
    }
    return VentureTicker.instance;
  }

  public start(tickRateMs: number = 3600000) {
    console.log('[Ticker] Heartbeat started.');
    this.intervalId = setInterval(() => this.tick(), tickRateMs);
    this.tick(); 
  }

  public stop() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private async tick() {
    const ventures = ventureRegistry.listVentures();
    
    for (const venture of ventures) {
      if (venture.status !== 'active') continue;

      for (const skillId of (venture.skills || [])) {
        const role = venture.org_chart.find((r: any) => r.capabilities?.includes(skillId)) || venture.org_chart[0];
        if (!role) continue;

        console.log(`[Ticker] Emitting autonomous ticket for ${skillId} in ${venture.name}`);
        
        try {
          const ticket = await TicketEngine.createTicket(venture, role, {
            title: `Autonomous Heartbeat: ${skillId}`,
            context: `Execute routine pulse for skill ${skillId}.`,
            priority: 'low'
          });

          await kernel.executeTicket(venture, ticket);
        } catch (e) {
          console.error(`[Ticker] Failed to process ${skillId}:`, e);
        }
      }
    }
  }
}

export const ventureTicker = VentureTicker.getInstance();
