"use client";

import { Settings, Network } from "lucide-react";
import { useRouter } from "next/navigation";

type TwinState = "idle" | "listening" | "thinking" | "speaking" | "learning";

interface StageHeaderProps {
  profileName: string | null;
  callState: TwinState;
}

const stateColorMap: Record<string, string> = {
  listening: "bg-state-listening",
  thinking: "bg-state-thinking",
  speaking: "bg-state-speaking",
  learning: "bg-state-learning",
};

export default function StageHeader({ profileName, callState }: StageHeaderProps) {
  const router = useRouter();

  const dotColor = callState !== "idle"
    ? `${stateColorMap[callState]} animate-pulse`
    : "bg-primitive-text-muted";

  return (
    <header className="flex justify-between items-center w-full max-w-4xl mx-auto z-10 glass-surface p-3 rounded-2xl">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-sm font-medium tracking-wide text-primitive-text-secondary">
          {profileName ? `${profileName}'s Twin` : "MyDigitalTwin"}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => router.push("/memory-canvas")}
          aria-label="Open Knowledge Graph"
          className="p-2 hover:bg-white/5 rounded-full transition-colors text-primitive-text-muted hover:text-[var(--foreground)]"
        >
          <Network size={18} />
        </button>
        <button
          onClick={() => router.push("/settings")}
          aria-label="Settings"
          className="p-2 hover:bg-white/5 rounded-full transition-colors text-primitive-text-muted hover:text-[var(--foreground)]"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
