import { registerOTel } from "@vercel/otel";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize OpenTelemetry with Vercel's registerOTel
    registerOTel({
      serviceName: 'digital-twin-app',
    });

    // Dynamic import to isolate Node.js-only dependencies (gRPC, SDK-Node)
    const { obs } = await import("./lib/observability/observability-service");
    
    // Initialize OpenTelemetry Tracing with Braintrust drain
    await obs.init();
  }
}
