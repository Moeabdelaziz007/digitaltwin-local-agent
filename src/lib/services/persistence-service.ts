import PocketBase from 'pocketbase';
import { v4 as uuidv4 } from 'uuid';
import { getServerPB } from '@/lib/pb-server';

const TURN_COLLECTION = 'conversation_turns';
const COUNTER_COLLECTION = 'session_counters';

export class PersistenceService {
  private static pb: PocketBase;

  private static getClient() {
    if (!this.pb) this.pb = getServerPB();
    return this.pb;
  }

  /**
   * Reserves the next turn index for a session using a counter document.
   */
  public static async reserveTurnIndex(userId: string, sessionId: string): Promise<number> {
    const pb = this.getClient();
    const filter = `user_id = "${userId}" && session_id = "${sessionId}"`;
    const maxAttempts = 7;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      let counter: any;
      try {
        counter = await pb.collection(COUNTER_COLLECTION).getFirstListItem(filter);
      } catch {
        counter = await pb.collection(COUNTER_COLLECTION).create({
          user_id: userId,
          session_id: sessionId,
          next_turn_index: 0,
        });
      }

      const current = Number(counter.next_turn_index ?? 0);
      try {
        await pb.collection(COUNTER_COLLECTION).update(counter.id, {
          next_turn_index: current + 1,
        });
        return current;
      } catch (error) {
        if (attempt === maxAttempts - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
      }
    }
    throw new Error('PersistenceService: Failed to reserve turn index');
  }

  /**
   * Saves a message to the conversations collection.
   */
  public static async saveMessage(data: {
    userId: string;
    sessionId: string;
    role: 'user' | 'twin' | 'system' | 'tool';
    content: string;
    turnIndex: number;
    turnId: string;
    messageId?: string;
  }) {
    const pb = this.getClient();
    return await pb.collection('conversations').create({
      user_id: data.userId,
      session_id: data.sessionId,
      role: data.role,
      content: data.content,
      turn_index: data.turnIndex,
      turn_id: data.turnId,
      message_id: data.messageId || uuidv4(),
    });
  }

  /**
   * Creates or updates a turn record.
   */
  public static async upsertTurn(id: string | null, data: any) {
    const pb = this.getClient();
    if (id) {
      return await pb.collection(TURN_COLLECTION).update(id, data);
    }
    return await pb.collection(TURN_COLLECTION).create(data);
  }

  /**
   * Finds a turn by its idempotency key.
   */
  public static async findTurnByIdempotency(userId: string, sessionId: string, key: string) {
    const pb = this.getClient();
    try {
      return await pb.collection(TURN_COLLECTION).getFirstListItem(
        `user_id = "${userId}" && session_id = "${sessionId}" && idempotency_key = "${key}"`,
      );
    } catch {
      return null;
    }
  }
}
