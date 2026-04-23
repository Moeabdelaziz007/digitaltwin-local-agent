import { v4 as uuidv4 } from 'uuid';
import { PersistenceService } from '../services/persistence-service';
import { Dispatcher } from './dispatcher';
import { buildMemoryContext } from '@/lib/memory-engine';
import { streamOllama, OllamaMessage, callOllama } from '@/lib/ollama-client';
import { obs } from '@/lib/observability/observability-service';
import { Ticket, Venture, Role } from '../holding/types';
import { SynapseRouter } from '../holding/synapse';
import { getSOPByDepartment } from '../holding/sops';
import { promises as fs } from 'fs';
import path from 'path';
import { ventureRegistry } from '../holding/venture-registry';
import { TicketEngine } from '../holding/ticket-engine';
import { JSONHardener } from '../utils/json-hardener';
import { skillRegistry } from '../skills/registry';
import '../skills/index'; // Ensure all skills are indexed
import { 
  CEO_SYNTHESIZER_PROMPT, 
  OPPORTUNITY_HUNTER_PROMPT, 
  VENTURE_CONDUCTOR_PROMPT 
} from '../consensus/prompts';

export class CoreKernel {
  private static instance: CoreKernel;

  private constructor() {}

  public static getInstance(): CoreKernel {
    if (!CoreKernel.instance) {
      CoreKernel.instance = new CoreKernel();
    }
    return CoreKernel.instance;
  }

  /**
   * Main entry point for User Chat requests.
   * Handles idempotency, memory context, tool-calling, and streaming setup.
   */
  public async processUserRequest(data: {
    userId: string;
    sessionId: string;
    message: string;
    idempotencyKey?: string;
  }) {
    return await obs.trace('kernel_process_user_request', {
      attributes: { 'session_id': data.sessionId, 'user_id': data.userId }
    }, async (span) => {
      // 1. Idempotency Check
      if (data.idempotencyKey) {
        const existing = await PersistenceService.findTurnByIdempotency(data.userId, data.sessionId, data.idempotencyKey);
        if (existing && (existing as any).status === 'completed') return { replay: existing };
      }

      // 2. Reserve Turn
      const turnIndex = await PersistenceService.reserveTurnIndex(data.userId, data.sessionId);
      const messageId = uuidv4();
      
      // 3. Create Processing Turn
      const turn = await PersistenceService.upsertTurn(null, {
        user_id: data.userId,
        session_id: data.sessionId,
        turn_index: turnIndex,
        idempotency_key: data.idempotencyKey,
        status: 'processing',
        request_message_id: messageId,
        trace_id: span.spanContext().traceId
      }) as any;

      // 4. Persistence: Save User Message
      await PersistenceService.saveMessage({
        userId: data.userId,
        sessionId: data.sessionId,
        role: 'user',
        content: data.message,
        turnIndex,
        turnId: turn.id,
        messageId
      });

      // 5. Context & Dispatching
      const systemPrompt = await buildMemoryContext(data.userId);
      const isVentureIntent = data.message.toLowerCase().includes('venture') || data.message.toLowerCase().includes('profit');

      let context: OllamaMessage[];
      if (isVentureIntent) {
        console.log('[Kernel] Venture Intent Detected. Routing to Strategy Engine.');
        const strategy = await this.resolveVentureStrategy(data.message, data.userId);
        context = [{ role: 'system', content: systemPrompt }, { role: 'assistant', content: strategy }];
      } else {
        const initialContext: OllamaMessage[] = [{ role: 'system', content: systemPrompt }];
        const dispatchResult = await Dispatcher.dispatch(data.message, initialContext, {
          userId: data.userId,
          sessionId: data.sessionId
        });
        context = dispatchResult.messages;
      }

      // 6. Return Streaming Prep
      return {
        turn,
        turnIndex,
        messageId,
        context,
        traceId: span.spanContext().traceId
      };
    });
  }

  /**
   * High-Level Strategy Synthesis (Replaces runConsensus)
   */
  private async resolveVentureStrategy(message: string, userId: string): Promise<string> {
    const hunter = await callOllama(`Analyze: ${message}`, [{ role: 'system', content: OPPORTUNITY_HUNTER_PROMPT }]);
    const conductor = await callOllama(`Plan: ${hunter}`, [{ role: 'system', content: VENTURE_CONDUCTOR_PROMPT }]);
    const ceo = await callOllama(`Synthesize: ${conductor}`, [{ role: 'system', content: CEO_SYNTHESIZER_PROMPT }]);
    
    return ceo;
  }

  /**
   * Universal Execution Engine for Tickets (Unified Logic)
   */
  public async executeTicket(venture: Venture, ticket: Ticket): Promise<string> {
    const role = venture.org_chart.find(r => r.id === ticket.assigned_role_id);
    if (!role) throw new Error(`Role ${ticket.assigned_role_id} not found`);

    // 1. Check for specialized Skill Execution
    const skillId = (ticket.metadata as any)?.skill_id;
    if (skillId) {
      const skill = skillRegistry.getSkill(skillId);
      if (skill && skill.instance) {
        console.log(`[Kernel] ⚡ Specialized Skill Found: ${skillId}. Redirecting to Skill Engine.`);
        const skillResult = await skill.instance.execute(venture, role, ticket);
        if (skillResult.success) return skillResult.output;
      }
    }

    // 2. Fallback to General SOP Execution
    const sop = getSOPByDepartment(role.department);
    const synapse = await SynapseRouter.resolveConfig(role, ticket.context, venture);

    const prompt = `
[VENTURE_OS: UNIFIED KERNEL EXECUTION]
Venture: ${venture.name} | Role: ${role.title}
SOP: ${sop?.steps.join(', ') || 'Standard best practices'}
TASK: ${ticket.context}
${synapse.context}
`;

    // Execute via Dispatcher (Unified reasoning loop)
    const result = await Dispatcher.dispatch(prompt, [
      { role: 'system', content: `You are the ${role.title} of ${venture.name}.` }
    ], { userId: 'system', sessionId: ticket.id });

    // Update Ticket
    await TicketEngine.updateTicket(ticket.id, { 
      status: 'done', 
      output: result.finalContent 
    });

    return result.finalContent;
  }

  /**
   * Finalizes a turn by saving the response and updating status.
   */
  public async finalizeTurn(turnId: string, userId: string, sessionId: string, turnIndex: number, content: string) {
    const twinMessageId = uuidv4();
    
    await PersistenceService.saveMessage({
      userId,
      sessionId,
      role: 'twin',
      content,
      turnIndex,
      turnId,
      messageId: twinMessageId
    });

    await PersistenceService.upsertTurn(turnId, {
      status: 'completed',
      response_content: content,
      twin_message_id: twinMessageId
    });
  }
}

export const kernel = CoreKernel.getInstance();
