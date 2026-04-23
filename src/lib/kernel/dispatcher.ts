import { env } from '@/lib/env';
import { toolRegistry } from '@/lib/plugins/tool-registry';
import { executeTool } from '@/lib/plugins/gateway';
import { OllamaMessage } from '@/lib/ollama-client';

export interface DispatcherResult {
  finalContent: string;
  messages: OllamaMessage[];
  toolCalls: any[];
}

export class Dispatcher {
  /**
   * Executes the autonomous tool-calling loop.
   */
  public static async dispatch(
    message: string, 
    context: OllamaMessage[],
    options: { userId: string; sessionId: string; maxIterations?: number }
  ): Promise<DispatcherResult> {
    const messages: OllamaMessage[] = [...context];
    if (message) messages.push({ role: 'user', content: message.trim() });

    let iterations = 0;
    const MAX_ITERATIONS = options.maxIterations || 3;
    const toolCallsMade: any[] = [];

    while (iterations < MAX_ITERATIONS) {
      const res = await fetch(`${env.OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: env.OLLAMA_MODEL,
          messages,
          tools: toolRegistry.getToolDefinitions(),
          stream: false,
        }),
      });

      if (!res.ok) throw new Error('Dispatcher: Ollama Tool Call API failed');
      const data = await res.json();
      const responseMessage = data.message as OllamaMessage;

      if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
        return {
          finalContent: responseMessage.content,
          messages,
          toolCalls: toolCallsMade
        };
      }

      messages.push(responseMessage);
      
      for (const toolCall of responseMessage.tool_calls) {
        console.log(`[Dispatcher] Executing tool: ${toolCall.function.name}`);
        const result = await executeTool(
          toolCall.function.name,
          toolCall.function.arguments || {},
          ['memory_read', 'memory_write'],
          { userId: options.userId, sessionId: options.sessionId }
        );
        
        messages.push({ 
          role: 'tool', 
          name: toolCall.function.name, 
          content: JSON.stringify(result) 
        });
        
        toolCallsMade.push({ name: toolCall.function.name, result });
      }
      
      iterations++;
    }

    throw new Error('Dispatcher: Maximum tool-calling iterations reached');
  }
}
