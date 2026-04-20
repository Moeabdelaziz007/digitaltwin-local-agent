// ============================================================
// Ollama Local LLM Client (V2 - Cognitive Edition)
// Optimized for gemma4 and Autonomous Tool Calling
// ============================================================

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4';

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
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
  const chatMessages: OllamaMessage[] = messages || [{ role: 'user', content: prompt }];

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: chatMessages,
      stream: false,
      options: { temperature: 0.7 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama Error: ${err}`);
  }

  const data = await res.json();
  return cleanMarkdown(data.message.content);
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

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: chatMessages,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error('Ollama streaming connection failed');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

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
            yield json.message.content;
          }
          if (json.done) return;
        } catch (e) {
          // Partial JSON line
        }
      }
    }
  } finally {
    reader.releaseLock();
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
  toolExecutor: (name: string, args: Record<string, any>) => Promise<unknown>
): Promise<string> {
  let messages: OllamaMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  let iterations = 0;
  const MAX_ITERATIONS = 3;

  while (iterations < MAX_ITERATIONS) {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        tools,
        stream: false,
      }),
    });

    if (!res.ok) throw new Error('Ollama Tool Call API failed');
    const data = await res.json();
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
