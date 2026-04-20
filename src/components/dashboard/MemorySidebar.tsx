"use client";

import { useState, useRef, useCallback } from "react";
import { Database } from "lucide-react";
import MemorySparkCard from "./MemorySparkCard";
import ThinkingStatePanel from "./ThinkingStatePanel";

type TwinState = "idle" | "listening" | "thinking" | "speaking" | "learning";
type SnapState = "collapsed" | "half" | "open";

interface MemorySidebarProps {
  callState: TwinState;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

/* ── Mock facts for V1 demonstration ── */
const MOCK_FACTS = [
  {
    fact: "You strictly prefer local-first, zero-latency architectures without excessive microservices.",
    category: "Preference",
    confidence: 0.98,
    tags: ["architecture", "local-first"],
  },
  {
    fact: "The Go sidecar now routes jobs entirely asynchronously.",
    category: "New Fact",
    confidence: 0.85,
    tags: ["go", "async"],
    timestamp: "Learned just now",
  },
  {
    fact: "Your preferred stack includes Next.js App Router with TypeScript.",
    category: "Preference",
    confidence: 0.92,
    tags: ["nextjs", "typescript"],
  },
];

export default function MemorySidebar({
  callState,
  mobileOpen,
  onMobileClose,
}: MemorySidebarProps) {
  const [activeTab, setActiveTab] = useState<"memory" | "thinking">("memory");
  const [snapState, setSnapState] = useState<SnapState>("half");
  const touchStartY = useRef(0);
  const touchDelta = useRef(0);

  /* ── Touch handlers for bottom-sheet snap ── */
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchDelta.current = 0;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchDelta.current = e.touches[0].clientY - touchStartY.current;
  }, []);

  const onTouchEnd = useCallback(() => {
    const delta = touchDelta.current;
    if (delta > 80) {
      // Swipe down
      if (snapState === "open") setSnapState("half");
      else onMobileClose();
    } else if (delta < -80) {
      // Swipe up
      if (snapState === "half") setSnapState("open");
    }
    touchDelta.current = 0;
  }, [snapState, onMobileClose]);

  const snapHeight: Record<SnapState, string> = {
    collapsed: "max-h-0",
    half: "max-h-[50vh]",
    open: "max-h-[85vh]",
  };

  /* ── Shared sidebar content ── */
  const sidebarContent = (
    <>
      {/* Tab bar */}
      <nav className="flex border-b border-border-subtle p-2 gap-2" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "memory"}
          onClick={() => setActiveTab("memory")}
          className={`flex-1 text-sm font-mono font-medium py-2 rounded-lg transition-colors ${
            activeTab === "memory"
              ? "bg-white/10 text-[var(--foreground)]"
              : "text-primitive-text-muted hover:text-primitive-text-secondary"
          }`}
        >
          Memory Sparks
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "thinking"}
          onClick={() => setActiveTab("thinking")}
          className={`flex-1 text-sm font-mono font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeTab === "thinking"
              ? "bg-white/10 text-state-thinking"
              : "text-primitive-text-muted hover:text-primitive-text-secondary"
          }`}
        >
          {callState === "thinking" && (
            <div className="w-1.5 h-1.5 rounded-full bg-state-thinking animate-ping" />
          )}
          Thinking
        </button>
      </nav>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" role="tabpanel" aria-labelledby={activeTab}>
        {activeTab === "memory" ? (
          <>
            <div className="text-xs font-mono text-primitive-text-muted uppercase tracking-widest mb-4 flex justify-between items-center">
              <span>Recent Facts</span>
              <Database size={14} />
            </div>
            {MOCK_FACTS.map((f, i) => (
              <MemorySparkCard key={i} {...f} />
            ))}
          </>
        ) : (
          <ThinkingStatePanel activeState={callState} />
        )}
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop: Fixed right rail ── */}
      <aside
        aria-label="Memory sidebar"
        className="hidden lg:flex w-[30%] max-w-96 border-l border-border-subtle bg-surface-panel shrink-0 flex-col"
      >
        {sidebarContent}
      </aside>

      {/* ── Mobile: Bottom sheet overlay ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <aside
            aria-label="Memory sidebar"
            aria-modal="true"
            role="dialog"
            className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-surface-panel border-t border-border-subtle rounded-t-2xl flex flex-col transition-all duration-300 ease-out ${snapHeight[snapState]}`}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Drag handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
