import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
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
      };
    }
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
