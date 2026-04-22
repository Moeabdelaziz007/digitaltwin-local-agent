// ============================================================
// Global Type Declarations & Augmentations
// Fixes TypeScript build errors across the codebase
// ============================================================

/** PocketBase SDK type augmentations */
declare module 'pocketbase' {
  export default class PocketBase {
    constructor(url: string);
    autoCancellation(value: boolean): void;
    collection(name: string): {
      getFullList<T>(options?: Record<string, any>): Promise<T[]>;
      getList<T>(page: number, perPage: number, options?: Record<string, any>): Promise<{ items: T[]; totalItems: number; totalPages: number }>;
      getFirstListItem<T>(filter: string): Promise<T>;
      create<T>(data: Record<string, any>): Promise<T>;
      update<T>(id: string, data: Record<string, any>): Promise<T>;
      delete(id: string): Promise<boolean>;
      subscribe<T>(filter: string, callback: (data: { action: string; record: T }) => void): Promise<Promise<() => void>>;
    };
  }
}

/** Browserbase SDK type declarations */
declare module '@browserbasehq/sdk' {
  export class Browserbase {
    constructor(options: { apiKey: string });
    sessions: {
      create(params: { projectId: string; keepAlive?: boolean; proxies?: boolean | Array<any> }): Promise<{
        id: string;
        status: string;
        connectUrl: string;
        seleniumRemoteUrl: string;
        signingKey: string;
      }>;
      retrieve(sessionId: string): Promise<any>;
      list(): Promise<Array<any>>;
      update(sessionId: string, params: { status?: 'REQUEST_RELEASE'; projectId?: string }): Promise<any>;
    };
  }
}

/** Groq SDK type declarations */
declare module 'groq-sdk' {
  export default class Groq {
    constructor(options: { apiKey: string });
    chat: {
      completions: {
        create(params: {
          messages: Array<{ role: string; content: string }>;
          model: string;
          temperature?: number;
          max_completion_tokens?: number;
          top_p?: number;
          stream?: boolean;
          stop?: string | Array<string> | null;
        }): Promise<{
          choices: Array<{
            message: { content: string };
            finish_reason: string | null;
          }>;
          usage: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
          };
        }>;
      };
    };
  }
}

/** Node.js crypto module augmentations */
declare module 'crypto' {
  export function createHash(algorithm: string): {
    update(data: string): { digest(encoding: string): string };
  };
  export function randomUUID(): string;
}

/** Vercel/OTEL module declarations */
declare module '@vercel/otel' {
  export function registerOTel(options: { serviceName: string }): void;
}

/** Braintrust module declarations */
declare module 'braintrust' {
  export function init(options: { apiKey: string; projectName?: string }): void;
  export function registerOtelFlush(sdk: any): void;
}

/** Global TypeScript augmentations */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      VERCEL_ENV?: 'development' | 'preview' | 'production';
      
      // Braintrust
      BRAINTRUST_API_KEY?: string;
      BRAINTRUST_PROJECT_ID?: string;
      
      // Browserbase
      BROWSERBASE_API_KEY?: string;
      BROWSERBASE_PROJECT_ID?: string;
      
      // Groq
      GROQ_API_KEY?: string;
      
      // Mixedbread AI
      MXBAI_API_KEY?: string;
      MXBAI_STORE_ID?: string;
      
      // Meticulous
      METICULOUS_RECORDING_TOKEN?: string;
      
      // LiveKit
      LIVEKIT_URL?: string;
      LIVEKIT_API_KEY?: string;
      LIVEKIT_API_SECRET?: string;
      
      // PocketBase
      POCKETBASE_URL?: string;
      NEXT_PUBLIC_POCKETBASE_URL?: string;
      PB_ADMIN_EMAIL?: string;
      PB_ADMIN_PASSWORD?: string;
      
      // Ollama
      OLLAMA_URL?: string;
      OLLAMA_MODEL?: string;
      
      // Sidecar
      SIDECAR_URL?: string;
      SIDECAR_SHARED_SECRET?: string;
      CRON_SECRET?: string;
      
      // Clerk
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
      CLERK_SECRET_KEY?: string;
      NEXT_PUBLIC_CLERK_FRONTEND_API?: string;
      CLERK_JWKS_URL?: string;
      CLERK_WEBHOOK_SECRET?: string;
      
      // Sentry
      SENTRY_AUTH_TOKEN?: string;
      NEXT_PUBLIC_SENTRY_DSN?: string;
      SENTRY_DSN?: string;
    }
  }
}

export {};
