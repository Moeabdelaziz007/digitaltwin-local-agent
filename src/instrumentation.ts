import { obs } from "./lib/observability/observability-service";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize OpenTelemetry Tracing
    obs.init();
  }
}
