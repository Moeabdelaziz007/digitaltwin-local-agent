"use client";

import { m, MotionValue } from "framer-motion";
import { useState } from "react";

type TwinState = "idle" | "listening" | "thinking" | "proposing" | "acting";

interface FloatingOrbProps {
  state: TwinState;
  x: MotionValue<number>;
  y: MotionValue<number>;
  dragConstraints: React.RefObject<HTMLDivElement | null>;
  onDragEnd: (event: any, info: any) => void;
  onToggle: () => void;
}

export default function FloatingOrb({ 
  state, 
  x, 
  y, 
  dragConstraints, 
  onDragEnd, 
  onToggle 
}: FloatingOrbProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Determine state colors from our Mirror Calm tokens
  const stateColorMap: Record<TwinState, string> = {
    idle: "var(--color-primitive-text-muted)",
    listening: "var(--color-state-listening)",
    thinking: "var(--color-state-thinking)",
    proposing: "var(--color-brand-warm)",
    acting: "var(--color-state-speaking)",
  };

  return (
    <m.button
      drag
      dragConstraints={dragConstraints}
      dragElastic={0.15}
      dragMomentum={false}
      onDragEnd={onDragEnd}
      style={{ x, y }}
      whileDrag={{ scale: 1.1, cursor: "grabbing" }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onToggle}
      aria-label={`MyDigitalTwin is ${state}. Click to interact.`}
      className="fixed top-0 left-0 z-[100] cursor-grab tap-target outline-none group"
    >
      {/* Outer Halo */}
      <m.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.6, 0.3],
          boxShadow: `0 0 30px 5px ${stateColorMap[state]}`,
        }}
        transition={{
          repeat: Infinity,
          duration: state === "listening" ? 1.5 : 4,
          ease: "easeInOut",
        }}
        className="absolute inset-0 rounded-full blur-xl"
        style={{ backgroundColor: stateColorMap[state] }}
      />

      {/* Main Orb Body */}
      <div 
        className="relative w-14 h-14 rounded-full border border-white/20 glass-surface flex items-center justify-center transition-twin group-focus-visible:ring-2 group-focus-visible:ring-brand-primary"
        style={{ borderColor: isHovered ? stateColorMap[state] : "rgba(255,255,255,0.2)" }}
      >
        <m.div 
          animate={{
            scale: state === "listening" ? [0.8, 1.2, 0.8] : 1,
          }}
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: stateColorMap[state] }}
        />
        
        {/* Proposing notification badge */}
        {state === "proposing" && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-warm rounded-full border-2 border-bg-app animate-bounce" />
        )}
      </div>
    </m.button>
  );
}
