'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-svh bg-bg-void flex items-center justify-center p-6 text-cyan font-display">
      <div className="absolute inset-0 scan-overlay pointer-events-none opacity-20" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass p-12 max-w-xl w-full border border-amber/30 text-center relative z-10 shadow-[0_0_50px_rgba(245,158,11,0.1)]"
      >
        <div className="mb-6 inline-block px-4 py-1 bg-amber/10 border border-amber/30 text-amber text-[10px] tracking-[0.3em] uppercase">
          System Breach Detected
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold mb-6 glitch-text uppercase tracking-tighter">
          Kernel <br /> Panic
        </h1>
        
        <p className="text-text-muted mb-12 text-sm leading-relaxed max-w-sm mx-auto">
          The neural link has encountered an unhandled exception. Technical diagnostics have been dispatched to the central hub.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="neon-border px-8 py-3 bg-cyan/10 hover:bg-cyan/20 transition-all font-bold uppercase tracking-widest text-xs"
          >
            ── Re-Initialize ──
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="px-8 py-3 bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-text-muted font-bold uppercase tracking-widest text-xs"
          >
            Hard Reboot
          </button>
        </div>

        <div className="mt-12 text-[8px] text-text-faint uppercase tracking-[0.2em]">
          Error Hash: {error.digest || 'UNKNOWN_INSTANCE'}
        </div>
      </motion.div>
    </main>
  );
}
