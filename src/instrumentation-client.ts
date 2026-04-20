import * as Sentry from "@sentry/nextjs";

// Ensure Sentry is only initialized once on the client
if (!Sentry.getClient()) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://c8557d5be09d568dc25a0ddcc3201237@o4510171400634368.ingest.us.sentry.io/4511254137339904",

    // Enable Session Replay for user-facing app interaction monitoring
    integrations: [
      Sentry.replayIntegration(),
    ],

    // 100% trace sampling in development, 10% in production
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

    // Replay 10% of sessions, but 100% of those with errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Enhanced observability as per SKILL.md
    sendDefaultPii: true,
  });
}
