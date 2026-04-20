"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import pb from "@/lib/pocketbase-client";
import type { UserProfile } from "@/types/twin";
import DashboardShell from "@/components/dashboard/DashboardShell";
import TwinStage from "@/components/dashboard/TwinStage";
import MemorySidebar from "@/components/dashboard/MemorySidebar";
import type { MiniTwinState } from "@/components/dashboard/MiniTwin/MiniTwinController";
import type { Proposal } from "@/components/dashboard/MiniTwin/ProposalPanel";

import { LiveKitRoom, AudioConference, ControlBar, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

type TwinState = "idle" | "listening" | "thinking" | "speaking" | "learning";

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [callState, setCallState] = useState<TwinState>("idle");
  const [liveCaption, setLiveCaption] = useState("Ready to connect...");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // LiveKit State
  const [token, setToken] = useState<string | null>(null);
  const url = "ws://localhost:7880";

  const [activeProposal, setActiveProposal] = useState<Proposal | null>(null);
  const [proposalOpen, setProposalOpen] = useState(false);
  const miniTwinState: MiniTwinState = activeProposal ? "proposing" : (callState as unknown as MiniTwinState);

  const { user } = useUser();

  /* ── Load user profile on mount ── */
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!user?.id) return;
      try {
        const record = await pb
          .collection("user_profiles")
          .getFirstListItem(`user_id="${user.id}"`);
        if (isMounted) setProfile(record as unknown as UserProfile);
      } catch (e: any) {
        if (isMounted) router.push("/onboard");
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [user?.id, router]);

  /* ── Subscribe to real-time agent proposals ── */
  useEffect(() => {
    if (!profile?.user_id) return;
    pb.collection("proposals").subscribe("*", (e) => {
      if (e.action === "create" && e.record.user_id === profile.user_id && e.record.status === "pending") {
        setActiveProposal(e.record as unknown as Proposal);
      }
    }, { requestKey: null });
    return () => { if (profile?.user_id) pb.collection("proposals").unsubscribe("*"); };
  }, [profile?.user_id]);

  /* ── Handle RTC Connection ── */
  const handleToggleRTC = async () => {
    if (token) {
      setToken(null);
      setCallState("idle");
      setLiveCaption("Disconnected.");
    } else {
      setCallState("thinking");
      setLiveCaption("Connecting to Digital Twin Swarm...");
      
      // MVP: In a real app, call /api/livekit/token
      // Using the devkey/secretsecret in LiveKit server
      setToken("dev-token-placeholder"); 
      setCallState("listening");
      setLiveCaption("Connected via WebRTC.");
    }
  };

  return (
    <DashboardShell
      miniTwinState={miniTwinState}
      activeProposal={activeProposal}
      proposalOpen={proposalOpen}
      onToggleMiniTwin={() => setProposalOpen(!proposalOpen)}
      onApproveProposal={() => { setActiveProposal(null); setProposalOpen(false); }}
      onRejectProposal={() => { setActiveProposal(null); setProposalOpen(false); }}
    >
      <div className="flex h-full flex-col lg:flex-row">
        {token ? (
          <LiveKitRoom
            audio={true}
            video={false}
            token={token}
            serverUrl={url}
            onDisconnected={() => setToken(null)}
            className="flex-1 flex flex-col"
          >
            <TwinStage
              callState={callState}
              profileName={profile?.display_name ?? null}
              liveCaption={liveCaption}
              isMicOn={true}
              onToggleMic={handleToggleRTC}
              onEndCall={() => setToken(null)}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            />
          </LiveKitRoom>
        ) : (
          <TwinStage
            callState="idle"
            profileName={profile?.display_name ?? null}
            liveCaption={liveCaption}
            isMicOn={false}
            onToggleMic={handleToggleRTC}
            onEndCall={() => {}}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
        )}
        <MemorySidebar
          callState={callState}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />
      </div>
    </DashboardShell>
  );
}
