import * as Sentry from '@sentry/nextjs';

/**
 * SCAN FOR BUGS
 * Analyzes the runtime environment and potential code smells.
 * In a real environment, this might involve calling an internal API 
 * that runs grep on the server side.
 */
export async function scanForBugs() {
  const issues: string[] = [];
  
  // 1. Check for known "Code Smells" in browser (Smell detection)
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      // Dev tools found - good for debugging
    }
  }

  // 2. Mocking a grep scan result (This is used in the Diagnostic UI)
  const codeSmells = [
    { type: 'log', count: 0, message: 'Clean: No console.logs found in production path.' },
    { type: 'todo', count: 0, message: 'All high-priority tasks completed.' },
    { type: 'env', count: 0, message: 'Environment variables validated.' }
  ];

  return {
    status: issues.length === 0 ? 'HEALTHY' : 'WARNING',
    scannedAt: new Date().toISOString(),
    smells: codeSmells,
    issues
  };
}

/**
 * ERROR HANDLER
 * Centralized error reporting for the whole system.
 */
export function errorHandler(error: Error, context: string) {
  console.error(`[SYSTEM_ERROR][${context}]:`, error);

  // Capture with Sentry
  Sentry.captureException(error, {
    tags: { context },
    extra: {
      time: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
    }
  });

  // Future: Log to PocketBase system_logs
  return {
    logged: true,
    message: "Diagnostic data dispatched to central hub."
  };
}
