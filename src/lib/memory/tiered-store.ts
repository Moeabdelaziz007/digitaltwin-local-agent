/**
 * src/lib/memory/tiered-store.ts
 * Tiered Memory Engine: Hot (Memory), Warm (PocketBase), Cold (Markdown Archive)
 * Inspired by MemGPT and Hierarchical Memory Systems.
 */

import pb from '@/lib/pocketbase-client';
import fs from 'fs';
import path from 'path';

export interface MemoryEntry {
  id: string;
  content: string;
  timestamp: number;
  type: 'action' | 'observation' | 'thought' | 'summary' | 'venture_failure';
  metadata?: Record<string, any>;
}

export interface MemoryTier {
  hot: Map<string, MemoryEntry>;   // Last 20-30 interactions (L1 Cache)
  warm: MemoryEntry[];             // Last 100-200 interactions from PB (L2 Cache)
}

const ARCHIVE_DIR = path.join(process.cwd(), 'memory_archives');

export class TieredMemoryStore {
  private static instance: TieredMemoryStore;
  private tier: MemoryTier = {
    hot: new Map(),
    warm: [],
  };

  private HOT_THRESHOLD = 25;
  private WARM_THRESHOLD = 150;
  private summarizer: ((entries: MemoryEntry[]) => Promise<string>) | null = null;

  private constructor() {
    this.ensureArchiveDir();
  }

  private ensureArchiveDir() {
    if (!fs.existsSync(ARCHIVE_DIR)) {
      fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    }
  }

  public static getInstance(): TieredMemoryStore {
    if (!TieredMemoryStore.instance) {
      TieredMemoryStore.instance = new TieredMemoryStore();
    }
    return TieredMemoryStore.instance;
  }

  public setSummarizer(fn: (entries: MemoryEntry[]) => Promise<string>) {
    this.summarizer = fn;
  }

  /**
   * HOT: Add to memory map.
   */
  public async add(content: string, type: MemoryEntry['type'] = 'thought', metadata: any = {}) {
    const entry: MemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      content,
      timestamp: Date.now(),
      type,
      metadata
    };

    this.tier.hot.set(entry.id, entry);
    
    // Auto-compaction if HOT is full
    if (this.tier.hot.size >= this.HOT_THRESHOLD) {
      await this.compactHotToWarm();
    }
    
    // Always sync to WARM (PocketBase) asynchronously
    this.syncToWarm(entry).catch(console.error);
  }

  /**
   * WARM: PocketBase storage.
   */
  private async syncToWarm(entry: MemoryEntry) {
    try {
      await pb.collection('memory_warm').create(entry);
    } catch (e) {
      // Fallback or silent log
    }
  }

  /**
   * COLD: Markdown Archiver.
   */
  private async archiveToCold(entries: MemoryEntry[]) {
    const dateStr = new Date().toISOString().split('T')[0];
    const filePath = path.join(ARCHIVE_DIR, `archive_${dateStr}.md`);
    
    let markdown = `\n## Archive Block ${new Date().toLocaleTimeString()}\n\n`;
    entries.forEach(e => {
      markdown += `### [${e.type.toUpperCase()}] ${new Date(e.timestamp).toISOString()}\n`;
      markdown += `${e.content}\n`;
      if (e.metadata) markdown += `*Metadata: ${JSON.stringify(e.metadata)}*\n`;
      markdown += `\n---\n`;
    });

    fs.appendFileSync(filePath, markdown, 'utf8');
    console.log(`[Memory-Cold] Archived ${entries.length} entries to ${filePath}`);
  }

  /**
   * Compaction Logic: HOT -> WARM -> COLD (Archive)
   */
  private async compactHotToWarm() {
    const entries = Array.from(this.tier.hot.values())
      .sort((a, b) => a.timestamp - b.timestamp);
    
    const pagedOut = entries.slice(0, 15); // Move oldest 15
    
    // 1. Remove from HOT
    pagedOut.forEach(e => this.tier.hot.delete(e.id));

    // 2. Generate Summary to keep context in HOT
    if (this.summarizer) {
      try {
        const summaryContent = await this.summarizer(pagedOut);
        await this.add(`RECAP: ${summaryContent}`, 'summary');
      } catch (e) {
        console.warn('[MemoryStore] Summarization failed during compaction.');
      }
    }

    // 3. Check WARM size for COLD migration
    try {
      const warmCount = (await pb.collection('memory_warm').getList(1, 1)).totalItems;
      if (warmCount > this.WARM_THRESHOLD) {
        await this.migrateWarmToCold();
      }
    } catch (e) {}
  }

  private async migrateWarmToCold() {
    try {
      const oldestWarm = await pb.collection('memory_warm').getList(1, 50, { sort: 'created' });
      if (oldestWarm.items.length > 0) {
        await this.archiveToCold(oldestWarm.items as any);
        // Batch delete from warm
        await Promise.all(oldestWarm.items.map(i => pb.collection('memory_warm').delete(i.id)));
      }
    } catch (e) {
      console.error('[Memory-Migration] Warm to Cold failed:', e);
    }
  }

  public getHotContext(): MemoryEntry[] {
    return Array.from(this.tier.hot.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  public async searchWarm(query: string): Promise<MemoryEntry[]> {
    try {
      const results = await pb.collection('memory_warm').getList(1, 5, {
        filter: `content ~ "${query}"`,
        sort: '-created'
      });
      return results.items as any;
    } catch (e) {
      return [];
    }
  }
}

export const tieredMemory = TieredMemoryStore.getInstance();
