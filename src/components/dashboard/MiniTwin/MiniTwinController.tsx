"use client";

import { ReactNode, useRef, useState, useEffect } from "react";
import { LazyMotion, domAnimation, MotionConfig, useMotionValue, useSpring, animate } from "framer-motion";
import FloatingOrb from "./FloatingOrb";
import ProposalPanel, { Proposal } from "./ProposalPanel";

export type MiniTwinState = "idle" | "listening" | "thinking" | "proposing" | "acting";

interface MiniTwinControllerProps {
  children: ReactNode;
  state: MiniTwinState;
  activeProposal: Proposal | null;
  panelOpen: boolean;
  onTogglePanel: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export default function MiniTwinController({
  children,
  state,
  activeProposal,
  panelOpen,
  onTogglePanel,
  onApprove,
  onReject,
}: MiniTwinControllerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Motion values for controlled position (drag & snap)
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Smooth spring physics for auto-snapping and movement
  const springConfig = { stiffness: 200, damping: 25 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  // Initialize position (bottom right)
  useEffect(() => {
    // We delay slightly to get correct window dimensions
    const timer = setTimeout(() => {
      x.set(window.innerWidth - 100);
      y.set(window.innerHeight - 120);
    }, 100);
    return () => clearTimeout(timer);
  }, [x, y]);

  // Snap to edge logic
  const handleDragEnd = (_: any, info: any) => {
    const screenWidth = window.innerWidth;
    const snapMargin = 24;
    const orbWidth = 64; 
    
    // Determine which side is closer
    const isLeft = info.point.x < screenWidth / 2;
    const targetX = isLeft ? snapMargin : screenWidth - orbWidth - snapMargin;

    // Animate to snap position
    animate(x, targetX, { type: "spring", ...springConfig });
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = 20;
    switch (e.key) {
      case "ArrowLeft": x.set(x.get() - step); break;
      case "ArrowRight": x.set(x.get() + step); break;
      case "ArrowUp": y.set(y.get() - step); break;
      case "ArrowDown": y.set(y.get() + step); break;
      case "Home": x.set(24); break;
      case "End": x.set(window.innerWidth - 88); break;
      case "Enter":
      case " ": 
        if (state === "proposing") onTogglePanel();
        break;
    }
  };

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <div 
          ref={containerRef}
          className="relative z-10 w-full h-full min-h-svh overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {children}
          
          {/* Ambient Overlay Components */}
          <FloatingOrb 
            state={state} 
            x={springX}
            y={springY}
            dragConstraints={containerRef}
            onDragEnd={handleDragEnd}
            onToggle={onTogglePanel} 
          />

          {panelOpen && (
             <ProposalPanel 
               proposal={activeProposal}
               onApprove={onApprove}
               onReject={onReject}
             />
          )}
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
