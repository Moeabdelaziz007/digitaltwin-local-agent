"use client";

import { Mic, Square, PanelBottomOpen } from "lucide-react";

interface CallControlDockProps {
  isMicOn: boolean;
  onToggleMic: () => void;
  onEndCall: () => void;
  onToggleSidebar?: () => void;
}

export default function CallControlDock({
  isMicOn,
  onToggleMic,
  onEndCall,
  onToggleSidebar,
}: CallControlDockProps) {
  return (
    <div className="mt-auto flex justify-center pb-4 z-10">
      <div className="glass-surface p-3 rounded-full flex items-center gap-4">
        {/* Mic Toggle — primary action */}
        <button
          onClick={onToggleMic}
          aria-label="Toggle microphone"
          aria-pressed={isMicOn}
          className={`p-4 rounded-full transition-twin flex items-center justify-center ${
            isMicOn
              ? "bg-state-listening/20 text-state-listening border border-state-listening/50 shadow-[0_0_15px_rgba(89,195,154,0.3)]"
              : "bg-white/5 text-primitive-text-muted hover:bg-white/10"
          }`}
        >
          {isMicOn ? <Square size={22} /> : <Mic size={24} />}
        </button>

        {/* End Session */}
        <button
          onClick={onEndCall}
          aria-label="End session"
          className="p-4 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors border border-red-500/30 flex items-center justify-center"
        >
          <Square size={18} fill="currentColor" />
        </button>

        {/* Mobile sidebar toggle — only visible below lg */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle memory sidebar"
            className="p-4 rounded-full bg-white/5 text-primitive-text-muted hover:bg-white/10 transition-colors flex items-center justify-center lg:hidden"
          >
            <PanelBottomOpen size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
