/**
 * src/lib/holding/ticket-engine.ts
 * محرك التذاكر والمراقبة المالية والمراجعة (Audit)
 */

import { Ticket, Role, Venture } from './types';
import { promises as fs } from 'fs';
import path from 'path';
import { BudgetMonitor } from './budget-monitor';
import { VentureRegistry } from './venture-registry';

export class TicketEngine {
  /**
   * إنشاء تذكرة جديدة مع التحقق من التكلفة والأهداف
   */
  public static async createTicket(
    venture: Venture,
    role: Role,
    input: Partial<Ticket>
  ): Promise<Ticket> {
    const budgetRequested = input.budget_allocated || 0;

    // 1. Zero-Cost Enforcer: التحقق من سقف ميزانية الدور
    if (budgetRequested > role.budget_limit_per_task) {
      if (!role.reporting_to_role_id) {
        throw new Error(`[CostControl] Budget ${budgetRequested} exceeds role limit and no reporting line defined.`);
      }
      console.log(`[CostControl] Task exceeds ${role.title} limit. Escalating to ${role.reporting_to_role_id}`);
      // هنا يمكن إضافة منطق الانتظار للموافقة
    }

    const ticket: Ticket = {
      id: `TKT-${Date.now()}`,
      venture_id: venture.id,
      title: input.title || 'Untitled Task',
      assigned_role_id: role.id,
      status: 'todo',
      priority: input.priority || 'medium',
      context: input.context || '',
      budget_allocated: budgetRequested,
      audit_trail: [`[${new Date().toISOString()}] Ticket created by ${role.title}`]
    };

    // 2. Immutable Audit: التسجيل في Journal
    await this.logToJournal(venture.id, `NEW TICKET: ${ticket.id} - ${ticket.title} (Budget: ${budgetRequested}$)`);

    return ticket;
  }

  /**
   * تحديث حالة تذكرة وحساب التكلفة المالية
   */
  public static async updateTicket(
    ventureId: string, 
    ticket: Ticket, 
    updates: Partial<Ticket>, 
    logEntry?: string
  ): Promise<Ticket> {
    const registry = VentureRegistry.getInstance();
    const venture = registry.getVenture(ventureId);
    
    // حساب التكلفة إذا تم تقديم بيانات استهلاك
    if (updates.output && venture) {
      const tokens = updates.output.length / 4; 
      const model = ticket.metadata?.model || 'ollama';
      const cost = BudgetMonitor.calculateCost(model, tokens);
      
      venture.budget.spent_this_month_usd += cost;
      venture.budget.spent_tokens += tokens;
    }

    Object.assign(ticket, updates);
    ticket.updated_at = new Date().toISOString();

    if (logEntry) {
      await this.logToJournal(ventureId, `[Ticket ${ticket.id}] ${logEntry}`);
    }

    return ticket;
  }

  private static async logToJournal(ventureId: string, message: string) {
    const journalPath = path.join(process.cwd(), 'ventures', ventureId, 'JOURNAL.md');
    const logEntry = `- [${new Date().toISOString()}] ${message}\n`;
    try {
      await fs.appendFile(journalPath, logEntry);
    } catch (e) {
      console.warn(`[TicketEngine] Could not write to journal for ${ventureId}`);
    }
  }
}
