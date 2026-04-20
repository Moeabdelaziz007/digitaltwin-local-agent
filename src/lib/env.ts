import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  POCKETBASE_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  SIDECAR_URL: z.string().url(),
  SIDECAR_SHARED_SECRET: z.string().min(1),
  CRON_SECRET: z.string().min(1),
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
  NODE_ENV: process.env.NODE_ENV === 'production' ? 'production' : process.env.NODE_ENV === 'test' ? 'test' : 'development',
  POCKETBASE_URL: process.env.POCKETBASE_URL || 'http://localhost:8090',
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET || '',
  SIDECAR_URL: process.env.SIDECAR_URL || 'http://localhost:8081',
  SIDECAR_SHARED_SECRET: process.env.SIDECAR_SHARED_SECRET || '',
  CRON_SECRET: process.env.CRON_SECRET || '',
} as const;

export const env = parsed.success ? parsed.data : fallbackEnv;
