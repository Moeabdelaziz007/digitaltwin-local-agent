export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import to isolate Node.js-only dependencies (gRPC, SDK-Node)
    const { obs } = await import("./lib/observability/observability-service");
    
    // Initialize OpenTelemetry Tracing
    obs.init();
  }
}
