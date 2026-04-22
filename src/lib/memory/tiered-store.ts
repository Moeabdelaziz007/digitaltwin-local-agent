import pb from '@/lib/pocketbase-client';

export interface MemoryEntry {
  id: string;
  content: string;
  timestamp: number;
  type: 'action' | 'observation' | 'thought' | 'summary';
  metadata?: Record<string, any>;
}

export interface MemoryTier {
  hot: Map<string, MemoryEntry>;   // Immediate context (e.g., last 20)
  warm: Map<string, MemoryEntry>;  // Recently paged out (e.g., last 200)
}

/**
 * TieredMemoryStore: Inspired by MemGPT.
 * Manages cognitive load by compacting "Hot" memory into summaries.
 */
export class TieredMemoryStore {
  private static instance: TieredMemoryStore;
  private tier: MemoryTier = {
    hot: new Map(),
    warm: new Map(),
  };

  private HOT_THRESHOLD = 20;
  private summarizer: ((entries: MemoryEntry[]) => Promise<string>) | null = null;

  private constructor() {}

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
   * Adds an entry to the HOT memory tier.
   */
  public async add(content: string, type: MemoryEntry['type'] = 'thought') {
    const entry: MemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      timestamp: Date.now(),
      type,
    };

    this.tier.hot.set(entry.id, entry);
    
    if (this.tier.hot.size >= this.HOT_THRESHOLD) {
      await this.compactHotMemory();
    }
    
    await this.syncToColdStorage(entry);
  }

  /**
   * Auto-compact: Summarize the oldest items using the injected LLM summarizer.
   */
  private async compactHotMemory() {
    const entries = Array.from(this.tier.hot.values())
      .sort((a, b) => a.timestamp - b.timestamp);
    
    const oldest = entries.slice(0, 10);
    
    // 1. Move to Warm
    oldest.forEach(e => {
      this.tier.hot.delete(e.id);
      this.tier.warm.set(e.id, e);
    });

    // 2. Generate Summary
    let summaryContent = `Summary of ${oldest.length} events...`;
    if (this.summarizer) {
      try {
        summaryContent = await this.summarizer(oldest);
      } catch (e) {
        console.error('[MemoryStore] Summarization failed, using fallback.');
      }
    }
    
    const summaryEntry: MemoryEntry = {
      id: `summary_${Date.now()}`,
      content: summaryContent,
      timestamp: Date.now(),
      type: 'summary',
    };

    this.tier.hot.set(summaryEntry.id, summaryEntry);
    console.log(`[MemoryStore] Compaction Complete: ${summaryContent.substring(0, 100)}`);
  }

  private async syncToColdStorage(entry: MemoryEntry) {
    try {
      await pb.collection('memory_cold_storage').create(entry);
    } catch (e) {
      // If collection doesn't exist yet, we log it
      console.warn('[MemoryStore] Cold sync failed. Ensure "memory_cold_storage" exists in PB.');
    }
  }

  public getContext(): MemoryEntry[] {
    return Array.from(this.tier.hot.values()).sort((a, b) => a.timestamp - b.timestamp);
  }
}

export const tieredMemory = TieredMemoryStore.getInstance();
