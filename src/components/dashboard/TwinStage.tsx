"use client";

import { PresenceOrb } from "@/components/PresenceOrb";
import StageHeader from "./StageHeader";
import LiveCaptionLine from "./LiveCaptionLine";
import CallControlDock from "./CallControlDock";

type TwinState = "idle" | "listening" | "thinking" | "speaking" | "learning";

interface TwinStageProps {
  callState: TwinState;
  profileName: string | null;
  liveCaption: string;
  isMicOn: boolean;
  onToggleMic: () => void;
  onEndCall: () => void;
  onToggleSidebar?: () => void;
}

export default function TwinStage({
  callState,
  profileName,
  liveCaption,
  isMicOn,
  onToggleMic,
  onEndCall,
  onToggleSidebar,
}: TwinStageProps) {
  return (
    <main className="flex-1 flex flex-col relative bg-bg-app p-4 sm:p-8">
      {/* Top bar */}
      <StageHeader profileName={profileName} callState={callState} />

      {/* Centered Orb */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <PresenceOrb state={callState} />
      </div>

      {/* Live Caption — floats near the bottom */}
      <LiveCaptionLine caption={liveCaption} />

      {/* Call Controls — sticky bottom */}
      <CallControlDock
        isMicOn={isMicOn}
        onToggleMic={onToggleMic}
        onEndCall={onEndCall}
        onToggleSidebar={onToggleSidebar}
      />
    </main>
  );
}
