"use client";

type TwinState = "idle" | "listening" | "thinking" | "speaking" | "learning";

interface ThinkingStatePanelProps {
  activeState: TwinState;
}

const PIPELINE_STEPS: {
  label: string;
  activeWhen: TwinState;
  colorVar: string;
}[] = [
  { label: "Heard", activeWhen: "listening", colorVar: "state-listening" },
  { label: "Recall", activeWhen: "thinking", colorVar: "state-thinking" },
  { label: "Compose", activeWhen: "speaking", colorVar: "state-speaking" },
  { label: "Learn", activeWhen: "learning", colorVar: "state-learning" },
];

export default function ThinkingStatePanel({ activeState }: ThinkingStatePanelProps) {
  return (
    <div>
      <div className="text-xs font-mono text-primitive-text-muted uppercase tracking-widest mb-4">
        Pipeline State
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
