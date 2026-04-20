import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // ── Diagnostic Error ──
    throw new Error("DigitalMiniTwin Sentry Verification: System Diagnostic Successful.");
  } catch (error) {
    // Manually capture and send to Sentry
    Sentry.captureException(error);
    
    return NextResponse.json({
      status: "DIAGNOSTIC_TRIGGERED",
      message: "A test error was intentionally thrown and dispatched to Sentry.",
      nextSteps: "Check your Sentry Issues dashboard to confirm receipt.",
    });
  }
}
