import { describe, it, expect, vi, beforeEach } from 'vitest';
import { kernel } from '../core-kernel';
import { PersistenceService } from '../../services/persistence-service';
import { Dispatcher } from '../dispatcher';

vi.mock('../../services/persistence-service');
vi.mock('../dispatcher');

describe('CoreKernel', () => {
  const mockData = {
    userId: 'user-123',
    sessionId: 'session-456',
    message: 'Hello Venture OS'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process a user request and return streaming context', async () => {
    // Setup Mocks
    (PersistenceService.reserveTurnIndex as any).mockResolvedValue(0);
    (PersistenceService.upsertTurn as any).mockResolvedValue({ id: 'turn-1' });
    (Dispatcher.dispatch as any).mockResolvedValue({
      messages: [{ role: 'assistant', content: 'Thinking...' }],
      finalContent: 'Hello!'
    });

    const result = await kernel.processUserRequest(mockData);

    expect(result).toHaveProperty('turn');
    expect(result).toHaveProperty('context');
    expect(PersistenceService.reserveTurnIndex).toHaveBeenCalledWith(mockData.userId, mockData.sessionId);
  });

  it('should handle idempotency correctly', async () => {
    (PersistenceService.findTurnByIdempotency as any).mockResolvedValue({
      status: 'completed',
      response_content: 'I already answered this',
      turn_index: 0
    });

    const result = await kernel.processUserRequest({
      ...mockData,
      idempotencyKey: 'fixed-key'
    });

    expect((result as any).replay).toBeDefined();
    expect((result as any).replay.response_content).toBe('I already answered this');
  });
});
