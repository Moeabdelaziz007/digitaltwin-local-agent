import { env } from '@/lib/env';
import { AgentType } from '@/types/agents';

export interface SidecarRequest {
  action: string;
  payload: any;
  sessionId: string;
}

export interface SidecarResponse {
  success: boolean;
  data: any;
  error?: string;
}

export class SidecarService {
  private static baseUrl = env.SIDECAR_URL || 'http://localhost:8080';

  /**
   * Dispatches a task to the Heavy-Lifting Sidecar
   */
  public static async dispatch(request: SidecarRequest): Promise<SidecarResponse> {
    console.log(`[Sidecar] Dispatching heavy-lifting action: ${request.action}`);

    try {
      const response = await fetch(`${this.baseUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Type': AgentType.SIDE_CAR,
          'Authorization': `Bearer ${env.CRON_SECRET}` // Shared Secret / HMAC
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Sidecar responded with ${response.status}`);
      }

      return await response.json();
    } catch (e: any) {
      console.error(`[Sidecar] Connection failed:`, e);
      return { success: false, data: null, error: e.message };
    }
  }
}
