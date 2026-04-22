/**
 * src/lib/consensus/venture-orchestrator.ts
 * المنسق المتقدم للمشاريع: يربط بين التذاكر، الأدوار، والقدرات الخارقة.
 */

import { Ticket, Venture, Role } from '../holding/types';
import { SynapseRouter } from '../holding/synapse';
import { getSOPByDepartment } from '../holding/sops';
import { callOllama } from '../ollama-client';
import { ollamaBreaker } from './circuit-breaker';
import { tieredMemory } from '../memory/tiered-store';
import { groq } from '../groq-service';

export class VentureOrchestrator {
  /**
   * تنفيذ تذكرة عمل محددة
   */
  public static async executeTicket(venture: Venture, ticket: Ticket): Promise<string> {
    const role = venture.org_chart.find(r => r.id === ticket.assigned_role_id);
    if (!role) throw new Error(`Role ${ticket.assigned_role_id} not found in venture ${venture.name}`);

    const sop = getSOPByDepartment(role.department);
    
    // 1. استخدام التوجيه العصبي (Synapse) لتحديد المزود والسياق
    const synapse = await SynapseRouter.resolveConfig(role, ticket.context);

    // 2. بناء الـ Prompt الكامل مع الـ SOP
    const prompt = `
[VENTURE_OS: TICKET EXECUTION]
Venture: ${venture.name}
Role: ${role.title}
Department: ${role.department}

SOP STEPS:
${sop?.steps.join('\n') || 'Follow general best practices.'}

TASK CONTEXT:
${ticket.context}

${synapse.context}

Provide the final output for this ticket. If you need approval for spending, state it clearly.
`;

    await tieredMemory.add(`Role ${role.title} is working on Ticket: ${ticket.title} via ${synapse.provider}`, 'thought');

    // 3. التنفيذ عبر المزود المختار
    let response: string;

    if (synapse.provider === 'groq') {
      response = await groq.chatCompletion({
        messages: [
          { role: 'system', content: `You are the ${role.title} of ${venture.name}. Act according to your SOP.` },
          { role: 'user', content: prompt }
        ],
        model: synapse.model
      });
    } else {
      response = await ollamaBreaker.execute(() => callOllama(prompt, [
        { role: 'system', content: `You are the ${role.title} of ${venture.name}. Act according to your SOP.` },
        { role: 'user', content: prompt }
      ]), '{"output": "Execution failed due to timeout"}');
    }

    return response;

    return response;
  }
}
