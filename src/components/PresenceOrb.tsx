"use client";

interface PresenceOrbProps {
  state: "idle" | "listening" | "thinking" | "speaking" | "learning" | "researching";
  size?: number; // Base size in tailwind units (e.g. 16 for w-16 h-16)
  className?: string;
}

export function PresenceOrb({ state, size = 64, className = "" }: PresenceOrbProps) {
  // Determine state-specific glow and animation classes
  const getGlowClass = () => {
    switch (state) {
      case "listening": return "orb-glow-listening";
      case "thinking": return "orb-glow-thinking";
      case "speaking": return "orb-glow-speaking";
      case "learning": return "orb-glow-learning";
      case "researching": return "orb-glow-researching";
      default: return "shadow-[0_0_30px_rgba(255,255,255,0.05)]"; // Idle subtle glow
    }
  };

  const getAnimationClass = () => {
    switch (state) {
      case "listening": return "animate-pulse-ring";
      case "thinking": return "animate-thinking-orbit";
      case "speaking": return "animate-pulse-ring";
      case "learning": return "animate-breathe";
      case "researching": return "animate-gear-rotate";
      default: return "animate-breathe";
    }
  };

  const getOrbFillClass = () => {
    switch (state) {
      case "listening": return "bg-[var(--color-state-listening)]/20 border-[var(--color-state-listening)]/50";
      case "thinking": return "bg-[var(--color-state-thinking)]/10 border-[var(--color-state-thinking)]/30";
      case "speaking": return "bg-[var(--color-state-speaking)]/30 border-[var(--color-state-speaking)]/80";
      case "learning": return "bg-[var(--color-state-learning)]/20 border-[var(--color-state-learning)]/60";
      case "researching": return "bg-[var(--color-state-researching)]/20 border-[var(--color-state-researching)]/60";
      default: return "bg-white/5 border-white/10";
    }
  };

  return (
    <div 
      className={`relative flex items-center justify-center transition-all ${className}`}
      style={{ width: size * 4, height: size * 4 }}
    >
      {/* Outer Halo */}
      <div 
        className={`absolute inset-0 rounded-full blur-xl opacity-50 transition-twin ${getGlowClass()} ${getAnimationClass()}`}
      />
      
      {/* Inner Solid Core */}
      <div 
        className={`relative z-10 rounded-full border-2 transition-twin glass-surface flex items-center justify-center ${getOrbFillClass()}`}
        style={{ width: size * 2, height: size * 2 }}
      >
        {state === "thinking" && (
          <div className="absolute inset-0 rounded-full border-t-2 border-[var(--color-state-thinking)] animate-spin opacity-50" />
        )}
        {state === "researching" && (
          <div className="flex space-x-1 opacity-60">
             <div className="w-1 h-4 bg-[var(--color-state-researching)] animate-pulse" />
             <div className="w-1 h-6 bg-[var(--color-state-researching)] animate-pulse [animation-delay:200ms]" />
             <div className="w-1 h-3 bg-[var(--color-state-researching)] animate-pulse [animation-delay:400ms]" />
          </div>
        )}
      </div>
    </div>
  );
}

