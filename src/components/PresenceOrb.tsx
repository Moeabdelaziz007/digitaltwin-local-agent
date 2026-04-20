"use client";

interface PresenceOrbProps {
  state: "idle" | "listening" | "thinking" | "speaking" | "learning";
}

export function PresenceOrb({ state }: PresenceOrbProps) {
  // Determine state-specific glow and animation classes
  const getGlowClass = () => {
    switch (state) {
      case "listening": return "orb-glow-listening";
      case "thinking": return "orb-glow-thinking";
      case "speaking": return "orb-glow-speaking";
      case "learning": return "shadow-[0_0_50px_var(--color-state-learning)]";
      default: return "shadow-[0_0_30px_rgba(255,255,255,0.05)]"; // Idle subtle glow
    }
  };

  const getAnimationClass = () => {
    switch (state) {
      case "listening": return "animate-pulse-ring";
      case "thinking": return "animate-thinking-orbit";
      case "speaking": return "animate-pulse-ring"; // Pulsing with voice in V1-lite
      default: return "animate-breathe";
    }
  };

  const getOrbFillClass = () => {
    switch (state) {
      case "listening": return "bg-[var(--color-state-listening)]/20 border-[var(--color-state-listening)]/50";
      case "thinking": return "bg-[var(--color-state-thinking)]/10 border-[var(--color-state-thinking)]/30";
      case "speaking": return "bg-[var(--color-state-speaking)]/30 border-[var(--color-state-speaking)]/80";
      case "learning": return "bg-[var(--color-state-learning)]/20 border-[var(--color-state-learning)]/60";
      default: return "bg-white/5 border-white/10";
    }
  };

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer Halo */}
      <div 
        className={`absolute inset-0 rounded-full blur-xl opacity-50 transition-twin ${getGlowClass()} ${getAnimationClass()}`}
      />
      
      {/* Inner Solid Core */}
      <div 
        className={`relative z-10 w-32 h-32 rounded-full border-2 transition-twin glass-surface flex items-center justify-center ${getOrbFillClass()}`}
      >
        {state === "thinking" && (
          <div className="absolute inset-0 rounded-full border-t-2 border-[var(--color-state-thinking)] animate-spin opacity-50" />
        )}
      </div>
    </div>
  );
}
