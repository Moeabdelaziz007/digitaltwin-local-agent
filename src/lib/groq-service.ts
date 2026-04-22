import Groq from 'groq-sdk';

/**
 * Groq AI Service - Fast, Free AI Inference
 * 
 * Provides access to Groq's ultra-fast inference API for:
 * - Cron jobs and background tasks
 * - AI agent reasoning and decision making
 * - Text generation and analysis
 * - Real-time chat completions
 * 
 * Available Models:
 * - qwen-qwq-32b: Advanced reasoning
 * - deepseek-r1-distill-llama-70b: Deep reasoning
 * - llama-3.3-70b-versatile: General purpose
 * - mixtral-8x7b-32768: Fast, cost-effective
 * - gemma-7b-it: Lightweight tasks
 * 
 * @see https://console.groq.com/docs/models
 */

class GroqService {
  private client: Groq | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      console.warn('[GROQ] GROQ_API_KEY not set - Groq service disabled');
      return;
    }

    try {
      this.client = new Groq({
        apiKey,
      });
      console.log('[GROQ] Client initialized');
    } catch (error) {
      console.error('[GROQ] Failed to initialize client:', error);
    }
  }

  /**
   * Check if Groq service is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Generate a chat completion
   */
  async chatCompletion(options: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  }): Promise<string> {
    if (!this.client) {
      throw new Error('[GROQ] Service not initialized - check GROQ_API_KEY');
    }

    const {
      messages,
      model = 'llama-3.3-70b-versatile',
      temperature = 0.6,
      maxTokens = 32768,
      stream = false,
    } = options;

    try {
      const completion = await this.client.chat.completions.create({
        messages,
        model,
        temperature,
        max_completion_tokens: maxTokens,
        top_p: 0.95,
        stream,
      });

      // For streaming, we'll handle differently
      if (stream) {
        console.warn('[GROQ] Streaming mode selected - use streamChatCompletion instead');
      }

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('[GROQ] Chat completion failed:', error);
      throw error;
    }
  }

  /**
   * Stream a chat completion
   */
  async *streamChatCompletion(options: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): AsyncGenerator<string> {
    if (!this.client) {
      throw new Error('[GROQ] Service not initialized - check GROQ_API_KEY');
    }

    const {
      messages,
      model = 'llama-3.3-70b-versatile',
      temperature = 0.6,
      maxTokens = 32768,
    } = options;

    try {
      const stream = await this.client.chat.completions.create({
        messages,
        model,
        temperature,
        max_completion_tokens: maxTokens,
        top_p: 0.95,
        stream: true,
      }) as any;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error('[GROQ] Stream chat completion failed:', error);
      throw error;
    }
  }

  /**
   * Quick reasoning/decision making (optimized for agent tasks)
   */
  async reason(prompt: string): Promise<string> {
    return this.chatCompletion({
      messages: [
        {
          role: 'system',
          content: 'You are an expert AI assistant. Provide clear, actionable reasoning and decisions.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'qwen-qwq-32b',
      temperature: 0.7,
    });
  }

  /**
   * Analyze text/data (for cron jobs, monitoring, etc.)
   */
  async analyze(prompt: string): Promise<string> {
    return this.chatCompletion({
      messages: [
        {
          role: 'system',
          content: 'You are an analytical AI assistant. Provide detailed, structured analysis.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'deepseek-r1-distill-llama-70b',
      temperature: 0.5,
    });
  }

  /**
   * Quick text generation (fast, lightweight)
   */
  async generate(prompt: string): Promise<string> {
    return this.chatCompletion({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'gemma-7b-it',
      temperature: 0.8,
      maxTokens: 1024,
    });
  }
}

// Singleton protection for Next.js hot reloads
const globalForGroq = globalThis as unknown as {
  groq: GroqService | undefined;
};

export const groq = globalForGroq.groq ?? new GroqService();

if (process.env.NODE_ENV !== 'production') globalForGroq.groq = groq;

export default groq;
