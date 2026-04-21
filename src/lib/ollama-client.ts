// ============================================================
// Ollama Local LLM Client (V2 - Cognitive Edition)
// Optimized for gemma4 and Autonomous Tool Calling
// ============================================================

import { env } from '@/lib/env';
import { obs } from '@/lib/observability/observability-service';
import { safeFetch } from '@/lib/safe-fetch';
import { trace, SpanStatusCode } from '@opentelemetry/api';
const OLLAMA_MODEL = env.OLLAMA_MODEL;
const EMBEDDING_MODEL = 'all-minilm';

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export interface OllamaTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string }>;
      required: string[];
    };
  };
}

/**
 * CAPABILITY 1: callOllama()
 * Send a chat request to Ollama and get a complete response.
 * Uses the /api/chat endpoint for better context management.
 * 
 * @param prompt - Single user prompt (fallback if messages not provided)
 * @param messages - Full conversation history
 */
export async function callOllama(
  prompt: string,
  messages?: OllamaMessage[]
): Promise<string> {
  return await obs.trace('ollama_chat', {
    attributes: { 'component': 'ollama', 'llm.op': 'chat' }
  }, async (span) => {
    const chatMessages: OllamaMessage[] = messages || [{ role: 'user', content: prompt }];
    const inputChars = chatMessages.reduce((sum, m) => sum + (m.content?.length || 0), 0);

    const result = await safeFetch(`${env.OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: chatMessages,
        stream: false,
        options: { temperature: 0.7 },
      }),
    }, {
      timeoutMs: 30000,
      retries: 2,
    });

    if (!result.ok || !result.response) {
      throw new Error(`Ollama Error: ${result.error?.message || 'Unknown error'}`);
    }

    const data = await result.response.json();
    const content = cleanMarkdown(data.message.content);
    const outputChars = content.length;

    obs.recordLlmStats(span, {
      model_name: OLLAMA_MODEL || 'unknown',
      message_count: chatMessages.length,
      role_sequence: chatMessages.map(m => m.role).join(','),
      input_chars: inputChars,
      output_chars: outputChars,
      actual_tokens: {
        eval_count: data.eval_count,
        prompt_eval_count: data.prompt_eval_count,
      },
      estimated_tokens: {
        input: Math.ceil(inputChars / 4),
        output: Math.ceil(outputChars / 4),
      },
      temperature: 0.7
    });

    return content;
  });
}

/**
 * CAPABILITY 2: streamOllama()
 * Streaming chat version using NDJSON.
 * 
 * @param prompt - Single user prompt
 * @param messages - Full conversation history
 */
export async function* streamOllama(
  prompt: string,
  messages?: OllamaMessage[]
): AsyncGenerator<string> {
  const chatMessages: OllamaMessage[] = messages || [{ role: 'user', content: prompt }];
  const inputChars = chatMessages.reduce((sum, m) => sum + (m.content?.length || 0), 0);

  // We manually manage the span here because it's a generator
  const tracer = trace.getTracer('digital-twin-core');
  const span = tracer.startSpan('ollama_stream', {
    attributes: {
      'component': 'ollama',
      'llm.op': 'stream',
      'llm.model_name': OLLAMA_MODEL || 'unknown',
      'llm.input_chars': inputChars,
      'llm.message_count': chatMessages.length,
      'llm.role_sequence': chatMessages.map(m => m.role).join(','),
    }
  });

  try {
    const result = await safeFetch(`${env.OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: chatMessages,
        stream: true,
      }),
    }, {
      timeoutMs: 10000, // Timeout for initial connection
      retries: 1,
    });

    if (!result.ok || !result.response || !result.response.body) {
      throw new Error('Ollama streaming connection failed');
    }

    const reader = result.response.body.getReader();
    const decoder = new TextDecoder();
    let fullOutput = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              fullOutput += json.message.content;
              yield json.message.content;
            }
            if (json.done) {
              span.setAttributes({
                'llm.output_chars': fullOutput.length,
                'llm.actual_eval_count': json.eval_count,
                'llm.actual_prompt_eval_count': json.prompt_eval_count,
                'llm.estimated_output_tokens': Math.ceil(fullOutput.length / 4),
              });
              return;
            }
          } catch {
            // Partial JSON line
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : 'Stream failed' });
    throw error;
  } finally {
    span.end();
  }
}

/**
 * CAPABILITY 3: callOllamaWithTools()
 * The Autonomous Cognitive Loop.
 * Executes tool calls provided by the LLM and manages context injection.
 * 
 * @param systemPrompt - The twin's identity and memory context
 * @param userMessage - The current user input
 * @param tools - Array of function definitions
 * @param toolExecutor - Callback to run the actual tool logic (PB, search, etc.)
 */
export async function callOllamaWithTools(
  systemPrompt: string,
  userMessage: string,
  tools: OllamaTool[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolExecutor: (name: string, args: Record<string, any>) => Promise<unknown>
): Promise<string> {
  const messages: OllamaMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  let iterations = 0;
  const MAX_ITERATIONS = 3;

  while (iterations < MAX_ITERATIONS) {
    const result = await safeFetch(`${env.OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        tools,
        stream: false,
      }),
    }, {
      timeoutMs: 60000,
      retries: 1,
    });

    if (!result.ok || !result.response) throw new Error('Ollama Tool Call API failed');
    const data = await result.response.json();
    const responseMessage = data.message as OllamaMessage;

    // Check if tools were requested
    if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
      return cleanMarkdown(responseMessage.content);
    }

    // Process Tool Calls
    messages.push(responseMessage);
    
    for (const toolCall of responseMessage.tool_calls) {
      const result = await toolExecutor(
        toolCall.function.name,
        toolCall.function.arguments || {}
      );
      
      messages.push({
        role: 'tool',
        name: toolCall.function.name,
        content: JSON.stringify(result),
      });
    }

    iterations++;
  }

  throw new Error('Ollama reached maximum tool call iterations');
}

/**
 * CAPABILITY 4: fetchEmbedding()
 * Generate vector embeddings for text using a local embedding model.
 */
export async function fetchEmbedding(prompt: string): Promise<number[] | null> {
  try {
    const result = await safeFetch(`${env.OLLAMA_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        prompt: prompt,
      }),
    }, {
      timeoutMs: 5000,
      retries: 1,
    });

    if (!result.ok || !result.response) return null;
    const data = await result.response.json();
    return data.embedding;
  } catch (error) {
    console.error('[OLLAMA/EMBEDDING] Failed to fetch embedding:', error);
    return null;
  }
}

/**
 * Helper to strip markdown code blocks if the LLM wraps JSON/Text in them.
 */
function cleanMarkdown(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n');
    if (lines[0].startsWith('```')) lines.shift();
    if (lines[lines.length - 1].startsWith('```')) lines.pop();
    cleaned = lines.join('\n');
  }
  return cleaned.trim();
}
