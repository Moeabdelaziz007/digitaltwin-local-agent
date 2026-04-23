'use client';

import React, { useEffect, useState } from 'react';

const ECONOMY_SIGNALS = [
  "ALPHA DETECTED: Cross-chain arbitrage ETH/USDC +1.4%",
  "NEURAL SYNC: User interests mapped to 47 micro-SaaS niches",
  "THE PRISM: Filtering 1,204 market signals for high-velocity gems",
  "THE CRUCIBLE: Smelting 'AI Agent Framework' - Revenue potential: $12k/mo",
  "KINETIC EDGE: Simulating distribution for 'Privacy-First Analytics'",
  "SYSTEM OK: 14 agents operational in Paperclip Holding v4.0",
  "OPPORTUNITY: SaaS Fragility detected in 'Legacy CRM' market",
  "REVENUE MIRROR: ROI Projection 240% for low-liquidity pairs"
];

export function EconomyTicker() {
  const [index, setIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setOpacity(0);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % ECONOMY_SIGNALS.length);
        setOpacity(1);
      }, 500);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-14 left-0 w-full z-40 px-6 pointer-events-none overflow-hidden">
      <div 
        className="flex items-center justify-center gap-4 transition-opacity duration-500"
        style={{ opacity }}
      >
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan/20 to-transparent" />
        <span className="font-display text-[8px] text-cyan/60 tracking-[0.4em] uppercase whitespace-nowrap">
          {ECONOMY_SIGNALS[index]}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan/20 to-transparent" />
      </div>
    </div>
  );
}
