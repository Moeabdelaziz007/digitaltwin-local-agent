import * as Sentry from "@sentry/nextjs";

export async function register() {
  const commonConfig = {
    dsn: process.env.SENTRY_DSN || "https://c8557d5be09d568dc25a0ddcc3201237@o4510171400634368.ingest.us.sentry.io/4511254137339904",
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    sendDefaultPii: true,
    enableLogs: true,
  };

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      ...commonConfig,
      includeLocalVariables: true,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      ...commonConfig,
    });
  }
}

// Automatically captures all unhandled server-side request errors
export const onRequestError = Sentry.captureRequestError;
