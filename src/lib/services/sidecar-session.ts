import { v4 as uuidv4 } from 'uuid';

export interface SidecarSession {
  id: string;
  startTime: number;
  maxDuration: number;
  status: 'active' | 'expired' | 'completed';
}

export class SidecarSessionManager {
  private static sessions: Map<string, SidecarSession> = new Map();

  public static createSession(durationMs: number = 300000): string { // 5 mins default
    const id = uuidv4();
    this.sessions.set(id, {
      id,
      startTime: Date.now(),
      maxDuration: durationMs,
      status: 'active'
    });
    return id;
  }

  public static validateSession(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;

    const expired = Date.now() - session.startTime > session.maxDuration;
    if (expired) {
      session.status = 'expired';
      this.sessions.delete(id);
      return false;
    }

    return session.status === 'active';
  }

  public static closeSession(id: string) {
    this.sessions.delete(id);
  }
}
