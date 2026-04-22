import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  
  // DATABASES & CORE INTEGRATIONS
  POCKETBASE_URL: z.string().url(),
  NEXT_PUBLIC_POCKETBASE_URL: z.string().url().optional(),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),

  // AI INFRASTRUCTURE (Ollama & Sidecar)
  OLLAMA_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('gemma4'),
  CONSENSUS_MODE: z.enum(['true', 'false']).default('false'),
  CONSENSUS_AB_PERCENT: z.coerce.number().min(0).max(100).default(10),
  SIDECAR_URL: z.string().url().optional(),
  SIDECAR_SHARED_SECRET: z.string().min(1).default('dev_secret_only'),

  // VOICE & REAL-TIME (LiveKit)
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  NEXT_PUBLIC_LIVEKIT_URL: z.string().optional(),
  ADMIN_USER_ID: z.string().min(1).optional(),
  PB_ADMIN_EMAIL: z.string().email().optional(),
  PB_ADMIN_PASSWORD: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missingOrInvalid = parsed.error.issues
    .map((issue) => issue.path.join('.'))
    .filter(Boolean)
    .join(', ');

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `[ENV] Missing or invalid required environment variables in production: ${missingOrInvalid}`
    );
  }

  console.warn(
    `[ENV] Missing or invalid environment variables outside production: ${missingOrInvalid}`
  );
}

const fallbackEnv = {
  NODE_ENV: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  POCKETBASE_URL: process.env.POCKETBASE_URL || 'http://localhost:8090',
  NEXT_PUBLIC_POCKETBASE_URL: process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090',
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET || '',
  CRON_SECRET: process.env.CRON_SECRET || '',
  OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'gemma4',
  CONSENSUS_MODE: (process.env.CONSENSUS_MODE || process.env.NEXT_PUBLIC_CONSENSUS_MODE) === 'true' ? 'true' : 'false',
  CONSENSUS_AB_PERCENT: Number(process.env.CONSENSUS_AB_PERCENT || process.env.NEXT_PUBLIC_CONSENSUS_AB_PERCENT || '10'),
  SIDECAR_URL: process.env.SIDECAR_URL || 'http://localhost:8081',
  SIDECAR_SHARED_SECRET: process.env.SIDECAR_SHARED_SECRET || 'dev_secret_only',
  ADMIN_USER_ID: process.env.ADMIN_USER_ID || '',
  PB_ADMIN_EMAIL: process.env.PB_ADMIN_EMAIL || '',
  PB_ADMIN_PASSWORD: process.env.PB_ADMIN_PASSWORD || '',
} satisfies Record<string, string | number | boolean>;

export const env = (parsed.success ? parsed.data : fallbackEnv) as z.infer<typeof envSchema>;
