import PocketBase from 'pocketbase';
import { env } from '@/lib/env';

// Tiered TTL Configuration
const CRITICAL_TTL = 60 * 1000; // 60 seconds for retrieval/routing hints
const STANDARD_TTL = 5 * 60 * 1000; // 5 minutes for general config

interface ConfigEntry {
  key: string;
  value: unknown;
  version: number;
  lastUpdated: number;
  category: 'retrieval' | 'prompt' | 'routing' | 'general';
}

class ConfigService {
  private static instance: ConfigService;
  private cache: Map<string, ConfigEntry> = new Map();
  private pb: PocketBase;
  private lkg: Map<string, unknown> = new Map(); // Last Known Good values

  private constructor() {
    this.pb = new PocketBase(env.POCKETBASE_URL);
    this.pb.autoCancellation(false);
    
    // Periodically refresh cache in background
    if (typeof window === 'undefined') {
      setInterval(() => this.backgroundRefresh(), 60000);
    }
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Get a config value with tiered caching logic.
   * Does NOT hit PB synchronously if valid cache exists.
   */
  public async get<T>(key: string, defaultValue: T): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();
    
    const ttl = (cached?.category === 'retrieval' || cached?.category === 'routing') 
      ? CRITICAL_TTL 
      : STANDARD_TTL;

    if (cached && (now - cached.lastUpdated < ttl)) {
      return cached.value as T;
    }

    // Cache expired or missing - fetch from PB
    try {
      const record = await this.pb.collection('app_config').getFirstListItem(`key="${key}" && is_active=true`);
      
      const entry: ConfigEntry = {
        key: record.key,
        value: record.value,
        version: record.version,
        lastUpdated: now,
        category: record.category
      };

      this.cache.set(key, entry);
      this.lkg.set(key, record.value); // Update LKG
      return record.value as T;
    } catch (error) {
      console.warn(`[CONFIG_SERVICE] Failed to fetch "${key}", falling back to LKG or default.`, error);
      return this.lkg.get(key) ?? defaultValue;
    }
  }

  /**
   * Explicitly invalidate a key (e.g. after a manual version bump in Admin UI)
   */
  public invalidate(key: string) {
    this.cache.delete(key);
  }

  /**
   * Background refresh of all active configs to keep cache warm and detect remote changes.
   */
  private async backgroundRefresh() {
    try {
      const records = await this.pb.collection('app_config').getFullList({
        filter: 'is_active = true'
      });

      const now = Date.now();
      for (const record of records) {
        this.cache.set(record.key, {
          key: record.key,
          value: record.value,
          version: record.version,
          lastUpdated: now,
          category: record.category
        });
        this.lkg.set(record.key, record.value);
      }
    } catch (error) {
      console.error('[CONFIG_SERVICE] Background refresh failed:', error);
    }
  }
}

export const config = ConfigService.getInstance();
