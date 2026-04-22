/**
 * src/lib/consensus/venture-orchestrator.ts
 * المنسق المتقدم للمشاريع: يربط بين التذاكر، الأدوار، والقدرات الخارقة.
 */

import { JSONHardener } from '../utils/json-hardener';
import { TicketEngine } from '../holding/ticket-engine';
import { SynapseRouter } from '../holding/synapse';
import { Role, Venture, Ticket } from '../holding/types';
import { callOllama } from '../ollama-client';
import { ollamaBreaker } from './circuit-breaker';
import { tieredMemory } from '../memory/tiered-store';
import { groq } from '../groq-service';
import { DAGExecutor, WorkflowNode } from './dag-executor';
import { delegateToExternalAgent, ExternalAgentType } from '../delegation/pty-session';
import { getSOPByDepartment } from '../holding/sops';

export class VentureOrchestrator {
  /**
   * تنفيذ تذكرة عمل محددة مع التتبع الكامل والتحليل المتين
   */
  public static async executeTicket(venture: Venture, ticket: Ticket): Promise<string> {
    const role = venture.org_chart.find(r => r.id === ticket.assigned_role_id);
    if (!role) throw new Error(`Role ${ticket.assigned_role_id} not found in venture ${venture.name}`);

    const sop = getSOPByDepartment(role.department);
    
    // 1. استخدام التوجيه العصبي (Synapse) لتحديد المزود والسياق مع محاذاة الأهداف
    const synapse = await SynapseRouter.resolveConfig(role, ticket.context, venture);

    // 2. بناء الـ Prompt الكامل مع الـ SOP والدستور
    const prompt = `
[VENTURE_OS: TICKET EXECUTION]
Venture: ${venture.name}
Mission: ${venture.mission_statement}
Role: ${role.title}
Department: ${role.department}

SOP STEPS:
${sop?.steps.join('\n') || 'Follow general best practices.'}

TASK CONTEXT:
${ticket.context}

${synapse.context}

Provide the final output for this ticket in JSON format if possible.
`;

    await tieredMemory.add(`Role ${role.title} is working on Ticket: ${ticket.title} via ${synapse.provider}`, 'thought');

    // 3. التنفيذ عبر المزود المختار
    let rawResponse: string;

    try {
      if (synapse.provider === 'groq') {
        rawResponse = await groq.chatCompletion({
          messages: [
            { role: 'system', content: `You are the ${role.title} of ${venture.name}. Act according to your SOP and Mission.` },
            { role: 'user', content: prompt }
          ],
          model: synapse.model
        });
      } else {
        rawResponse = await ollamaBreaker.execute(() => callOllama(prompt, [
          { role: 'system', content: `You are the ${role.title} of ${venture.name}. Act according to your SOP and Mission.` },
          { role: 'user', content: prompt }
        ]), '{"output": "Execution failed due to timeout"}');
      }

      // 4. JSON Hardener: استخراج النتيجة بشكل نظيف
      const parsedOutput = JSONHardener.extract<any>(rawResponse);
      const finalResult = typeof parsedOutput === 'string' ? parsedOutput : JSON.stringify(parsedOutput, null, 2);

      // 5. تحديث التذكرة والأثر (Audit Trail)
      await TicketEngine.updateTicket(venture.id, ticket, { 
        status: 'done', 
        output: finalResult 
      }, `Completed by ${role.title} using ${synapse.provider}`);

      return finalResult;
    } catch (error: any) {
      await TicketEngine.updateTicket(venture.id, ticket, { 
        status: 'blocked' 
      }, `Failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * تنفيذ سير عمل كامل (DAG Workflow)
   */
  public static async executeWorkflow(venture: Venture, nodes: WorkflowNode[]): Promise<Map<string, any>> {
    const executor = new DAGExecutor(nodes);
    
    return await executor.execute(async (node) => {
      // 1. العثور على الدور المناسب للوكيل
      const role = venture.org_chart.find(r => r.title.toLowerCase() === node.agent.toLowerCase());
      if (!role) throw new Error(`Role for agent ${node.agent} not found`);

      // 2. إذا كان الوكيل خارجياً (External)، نستخدم التفويض
      if (node.agent.includes('claude') || node.agent.includes('aider')) {
        const result = await delegateToExternalAgent(node.agent as ExternalAgentType, node.task);
        return result.output;
      }

      // 3. خلاف ذلك، نستخدم التنفيذ المحلي المعتاد
      const ticket = await TicketEngine.createTicket(venture, role, { title: node.id, context: node.task });
      return await this.executeTicket(venture, ticket);
    });
  }
}
