import { describe, it, expect, vi, beforeEach } from 'vitest';
import { groq } from '@/lib/groq-service';

describe('Groq Service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('Initialization', () => {
    it('should be available when GROQ_API_KEY is set', () => {
      expect(groq.isAvailable()).toBe(true);
    });

    it('should have client initialized', () => {
      expect(groq).toBeDefined();
    });
  });

  describe('Chat Completion', () => {
    it('should generate response for simple prompt', async () => {
      const response = await groq.chatCompletion({
        messages: [
          { role: 'user', content: 'Say hello in one word' },
        ],
        model: 'gemma-7b-it',
        maxTokens: 10,
      });

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    }, 30000);

    it('should work with different models', async () => {
      const models = ['gemma-7b-it', 'llama-3.3-70b-versatile'];

      for (const model of models) {
        const response = await groq.chatCompletion({
          messages: [{ role: 'user', content: 'Test' }],
          model,
          maxTokens: 20,
        });

        expect(response).toBeDefined();
      }
    }, 60000);

    it('should handle system messages', async () => {
      const response = await groq.chatCompletion({
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'What is 2+2?' },
        ],
        model: 'gemma-7b-it',
        maxTokens: 50,
      });

      expect(response).toContain('4');
    }, 30000);
  });

  describe('Reasoning', () => {
    it('should provide reasoning for complex questions', async () => {
      const reasoning = await groq.reason('Why is TypeScript important for large codebases?');

      expect(reasoning).toBeDefined();
      expect(reasoning.length).toBeGreaterThan(50);
    }, 30000);
  });

  describe('Generation', () => {
    it('should generate quick responses', async () => {
      const result = await groq.generate('List 3 benefits of AI in one sentence');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(20);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle invalid model gracefully', async () => {
      await expect(
        groq.chatCompletion({
          messages: [{ role: 'user', content: 'Test' }],
          model: 'invalid-model',
        })
      ).rejects.toThrow();
    }, 30000);
  });
});
