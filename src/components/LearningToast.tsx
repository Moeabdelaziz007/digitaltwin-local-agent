'use client';

import { useEffect, useState } from 'react';

export function LearningToast({ fact }: { fact?: string }) {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    // Only show if there's a new fact
    if (fact) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [fact]);
  
  if (!visible || !fact) return null;

  return (
    <div className="fixed bottom-8 right-8 w-80 p-6 glass rounded-2xl shadow-2xl animate-in slide-in-from-right-10 fade-in duration-500 z-50">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 bg-cyan rounded-full animate-pulse shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
        <div>
          <p className="text-xs font-display font-bold text-cyan mb-1 tracking-widest uppercase glow-text">COGNITIVE ADAPTATION</p>
          <p className="text-sm text-text-primary line-clamp-2">{fact}</p>
        </div>
      </div>
    </div>
  );
}
