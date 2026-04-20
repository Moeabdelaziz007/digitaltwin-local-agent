import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://c8557d5be09d568dc25a0ddcc3201237@o4510171400634368.ingest.us.sentry.io/4511254137339904",

  // Edge runtime tracing
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  sendDefaultPii: true,
  enableLogs: true,
});
