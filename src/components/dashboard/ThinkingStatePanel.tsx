"use client";

type TwinState = "idle" | "listening" | "thinking" | "speaking" | "learning";

interface ThinkingStatePanelProps {
  activeState: TwinState;
  consensusRisk?: 'low' | 'med' | 'high';
  consensusConfidence?: number;
}

const PIPELINE_STEPS: {
  label: string;
  activeWhen: TwinState;
  colorVar: string;
}[] = [
  { label: "Planner", activeWhen: "thinking", colorVar: "state-thinking" },
  { label: "Critic", activeWhen: "speaking", colorVar: "state-speaking" },
  { label: "Guardian", activeWhen: "learning", colorVar: "state-learning" },
];

export default function ThinkingStatePanel({
  activeState,
  consensusRisk = 'med',
  consensusConfidence,
}: ThinkingStatePanelProps) {
  return (
    <div>
      <div className="text-xs font-mono text-primitive-text-muted uppercase tracking-widest mb-4">
        Consensus Timeline
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] px-2 py-1 rounded-full border border-border-subtle uppercase font-mono text-primitive-text-muted">
          risk: {consensusRisk}
        </span>
        <span className="text-[10px] px-2 py-1 rounded-full border border-border-subtle uppercase font-mono text-primitive-text-muted">
          confidence: {Math.round((consensusConfidence ?? 0.5) * 100)}%
        </span>
      </div>

      <div className="space-y-3 font-mono text-xs text-primitive-text-muted">
        {PIPELINE_STEPS.map((step, i) => {
          const isActive = activeState === step.activeWhen;

          return (
            <div
              key={step.label}
              className={`p-3 rounded-lg border transition-twin flex items-center gap-3 ${
                isActive
                  ? `border-${step.colorVar}/30 bg-${step.colorVar}/5 text-${step.colorVar}`
                  : "border-border-subtle"
              }`}
            >
              {/* Step number indicator */}
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  isActive
                    ? `bg-${step.colorVar}/20 text-${step.colorVar}`
                    : "bg-white/5 text-primitive-text-muted"
                }`}
              >
                {i + 1}
              </span>

              <span>{step.label}</span>

              {isActive && (
                <div className={`w-1.5 h-1.5 rounded-full bg-${step.colorVar} animate-pulse ml-auto`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
