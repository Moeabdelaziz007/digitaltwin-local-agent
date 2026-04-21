import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Authenticate Request
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized access to cognitive layer" }, { status: 401 });
    }

    // 2. Validate Environment
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json({ error: "Voice infrastructure not configured" }, { status: 500 });
    }

    // 3. Generate LiveKit Access Token
    // We create a standard room named after the user's dashboard session
    const roomName = `twin-session-${userId}`;
    const participantName = `User-${userId.slice(-4)}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token, room: roomName, url: wsUrl });
  } catch (error) {
    console.error("[LIVEKIT_TOKEN_ERROR]", error);
    return NextResponse.json({ error: "Failed to establish voice bridge" }, { status: 500 });
  }
}
