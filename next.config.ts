import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer, dev }) => {
    // Exclude Node.js native modules from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        dns: false,
        http2: false,
        async_hooks: false,
        perf_hooks: false,
      };
    }

    // [FIX] Disable persistent cache in Vercel/CI to prevent 'Unable to snapshot resolve dependencies'
    if (!dev && process.env.VERCEL) {
      config.cache = false;
    }

    // [FIX] Force Turbopack to use npm pocketbase package instead of binary file
    config.resolve.alias = {
      ...config.resolve.alias,
      'pocketbase': require.resolve('pocketbase'),
    };

    return config;
  },
  serverExternalPackages: [
    "@opentelemetry/sdk-node",
    "@opentelemetry/api-logs",
    "@opentelemetry/instrumentation",
    "@opentelemetry/sdk-logs",
    "@grpc/grpc-js",
    "@opentelemetry/exporter-logs-otlp-grpc",
    "@opentelemetry/exporter-trace-otlp-grpc",
    "@opentelemetry/otlp-grpc-exporter-base"
  ],
};

export default nextConfig;
