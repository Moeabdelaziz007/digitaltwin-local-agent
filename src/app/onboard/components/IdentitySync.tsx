'use client';

import { motion } from 'framer-motion';
import { Cpu, ArrowRight } from 'lucide-react';
import { TerminalIntro } from '@/components/TerminalIntro';

interface IdentitySyncProps {
  displayName: string;
  setDisplayName: (val: string) => void;
  goal: string;
  setGoal: (val: string) => void;
  nextStep: () => void;
}

export function IdentitySync({ displayName, setDisplayName, goal, setGoal, nextStep }: IdentitySyncProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="glass p-8 rounded-2xl border border-white/10"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-cyan/10 flex items-center justify-center text-cyan">
          <Cpu size={20} />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold tracking-tight">IDENTITY SYNC</h1>
          <TerminalIntro text="ESTABLISHING NEURAL PARAMETERS..." />
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-cyan/60 mb-2">User Identifier</label>
          <input 
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/20 transition-all font-mono"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-cyan/60 mb-2">Core Objective</label>
          <input 
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Wealth generation, venture scouting"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/20 transition-all font-mono"
          />
        </div>
      </div>

      <button 
        onClick={nextStep}
        className="w-full mt-8 bg-cyan text-bg-void py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        Next Step <ArrowRight size={16} />
      </button>
    </motion.div>
  );
}
