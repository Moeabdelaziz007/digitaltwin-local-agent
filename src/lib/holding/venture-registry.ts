/**
 * src/lib/holding/venture-registry.ts
 * سجل الشركات المستقلة: المدير المسؤول عن تخزين واسترجاع بيانات المحفظة الاستثمارية.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { getServerPB } from '../pb-server';
import { Venture, Goal, Role, Ticket } from './types';

export class VentureRegistry {
  private pb = getServerPB();

  constructor() {}

  /**
   * Singleton with globalThis protection for Next.js Hot Reload
   */
  public static getInstance(): VentureRegistry {
    const globalAny = globalThis as any;
    if (!globalAny.ventureRegistryInstance) {
      globalAny.ventureRegistryInstance = new VentureRegistry();
    }
    return globalAny.ventureRegistryInstance;
  }

  /**
   * إنشاء مشروع (Venture) جديد مع ملفات الذاكرة البشرية (SOUL & JOURNAL)
   */
  public async createVenture(venture: Partial<Venture>): Promise<Venture> {
    try {
      const record = await (this.pb.collection('ventures') as any).create({
        ...venture,
        status: 'active',
        created_at: new Date().toISOString(),
      });

      // درس OpenClaw: إنشاء ملفات الذاكرة النصية
      const venturePath = path.join(process.cwd(), 'ventures', record.id);
      await fs.mkdir(venturePath, { recursive: true });
      
      const soulContent = `# SOUL of ${record.name}\n\nVision: ${record.vision}\nCreated: ${record.created_at}\n\n## Identity\nThis venture is a digital autonomous entity...`;
      await fs.writeFile(path.join(venturePath, 'SOUL.md'), soulContent);
      await fs.writeFile(path.join(venturePath, 'JOURNAL.md'), `# JOURNAL of ${record.name}\n\nAudit log and daily progress...`);

      return record as any;
    } catch (error) {
      console.error('[VentureRegistry] Failed to create venture:', error);
      throw error;
    }
  }

  /**
   * استرجاع كافة المشاريع النشطة
   */
  public async getActiveVentures(): Promise<Venture[]> {
    try {
      const records = await (this.pb.collection('ventures') as any).getFullList({
        filter: 'status = "active"',
      });
      return records as any;
    } catch (error) {
      return [];
    }
  }

  /**
   * تحديث هدف معين داخل مشروع
   */
  public async updateGoal(ventureId: string, goal: Goal): Promise<void> {
    try {
      // منطق التحديث في قاعدة البيانات (سواء كان جدول منفصل أو حقل JSON)
      console.log(`[VentureRegistry] Updating goal ${goal.id} for venture ${ventureId}`);
    } catch (error) {
      console.error('[VentureRegistry] Goal update failed:', error);
    }
  }

  /**
   * إضافة تذكرة (Ticket) جديدة لنظام العمل
   */
  public async createTicket(ticket: Partial<Ticket>): Promise<Ticket> {
    try {
      const record = await (this.pb.collection('tickets') as any).create({
        ...ticket,
        status: 'todo',
        audit_trail: [`[System] Ticket created at ${new Date().toISOString()}`],
      });
      return record as any;
    } catch (error) {
      console.error('[VentureRegistry] Ticket creation failed:', error);
      throw error;
    }
  }

  /**
   * الحصول على الهيكل التنظيمي لشركة
   */
  public async getOrgChart(ventureId: string): Promise<Role[]> {
    try {
      const venture = await (this.pb.collection('ventures') as any).getOne(ventureId);
      return venture.org_chart || [];
    } catch (error) {
      return [];
    }
  }
}

export const ventureRegistry = VentureRegistry.getInstance();
