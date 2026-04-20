import { z } from 'zod';

const envSchema = z.object({
  // CLERK
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  
  // DATABASES & INTEGRATIONS
  POCKETBASE_URL: z.string().url().default('http://localhost:8090'),
  NEXT_PUBLIC_POCKETBASE_URL: z.string().url().default('http://localhost:8090'),
  
  // AI INFRASTRUCTURE
  OLLAMA_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('gemma4'),
  SIDECAR_URL: z.string().url().optional(),
  SIDECAR_SECRET: z.string().min(8).default('dev_secret_only'),
  
  // VOICE & REAL-TIME
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  NEXT_PUBLIC_LIVEKIT_URL: z.string().optional(),
});

/**
 * Validates and exports environment variables.
 * Call this at app startup to catch configuration issues early.
 */
function validateEnv() {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ [ENV] Invalid Environment Variables:', result.error.flatten().fieldErrors);
    // In production, we throw to prevent the app from running in a broken state
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Critical Environment Configuration Error');
    }
    return result.data || process.env;
  }
  
  return result.data;
}

export const env = validateEnv();
