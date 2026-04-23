/**
 * src/lib/holding/ticket-engine.ts
 * محرك التذاكر والمراقبة المالية والمراجعة (Audit)
 */

import { Ticket, Role, Venture } from './types';
import { promises as fs } from 'fs';
import path from 'path';
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
      audit_trail: [`[${new Date().toISOString()}] Ticket created by ${role.title}`],
      created_at: new Date().toISOString()
    };

    // 2. Immutable Audit: التسجيل في Journal
    await this.logToJournal(venture.id, `NEW TICKET: ${ticket.id} - ${ticket.title} (Budget: ${budgetRequested}$)`);

    // 3. Simulation Storage: تخزين في الذاكرة المؤقتة للاختبار
    if (!(globalThis as any)._tickets) (globalThis as any)._tickets = new Map();
    (globalThis as any)._tickets.set(ticket.id, ticket);

    return ticket;
  }

  /**
   * استرجاع تذكرة (محاكاة - في الإنتاج يتم البحث في DB)
   */
  public static async getTicket(ticketId: string): Promise<Ticket | null> {
    // This is a placeholder. In a real app, we'd fetch from PocketBase or local JSON
    return (globalThis as any)._tickets?.get(ticketId) || null;
  }

  /**
   * استرجاع جميع التذاكر
   */
  public static async listTickets(): Promise<Ticket[]> {
    return Array.from(((globalThis as any)._tickets?.values() || [])) as Ticket[];
  }

  /**
   * تحديث حالة تذكرة وحساب التكلفة المالية
   */
  public static async updateTicket(
    ticketId: string, 
    updates: Partial<Ticket>
  ): Promise<Ticket> {
    const ticket = await this.getTicket(ticketId);
    if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

    Object.assign(ticket, updates);
    ticket.updated_at = new Date().toISOString();

    await this.logToJournal(ticket.venture_id, `UPDATED TICKET: ${ticket.id} - New Status: ${ticket.status}`);

    return ticket;
  }

  private static async logToJournal(ventureId: string, message: string) {
    const journalPath = path.join(process.cwd(), 'ventures', ventureId, 'JOURNAL.md');
    const logEntry = `- [${new Date().toISOString()}] ${message}\n`;
    try {
      await fs.mkdir(path.dirname(journalPath), { recursive: true });
      await fs.appendFile(journalPath, logEntry);
    } catch (e) {
      console.warn(`[TicketEngine] Could not write to journal for ${ventureId}`);
    }
  }
}
