import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: "aaas-6y",
  project: "digital-mini-twin",

  // Source map upload auth token
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Better stack trace resolution
  widenClientFileUpload: true,

  // Ad-blocker bypass
  tunnelRoute: "/monitoring",

  // Suppress non-CI output
  silent: !process.env.CI,
});
