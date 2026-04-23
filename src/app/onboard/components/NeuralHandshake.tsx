'use client';

import { motion } from 'framer-motion';
import { Brain, Sparkles } from 'lucide-react';
import { TerminalIntro } from '@/components/TerminalIntro';

interface NeuralHandshakeProps {
  previewDraft: string;
  handleComplete: () => void;
  setStep: (s: number) => void;
  loading: boolean;
}

export function NeuralHandshake({ previewDraft, handleComplete, setStep, loading }: NeuralHandshakeProps) {
  return (
    <motion.div 
      key="step4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="glass p-8 rounded-2xl border border-white/10"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-cyan/10 flex items-center justify-center text-cyan">
          <Sparkles size={20} />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold tracking-tight">NEURAL HANDSHAKE</h1>
          <TerminalIntro text="READY FOR DEPLOYMENT." />
        </div>
      </div>

      <div className="p-6 bg-cyan/5 border border-cyan/20 rounded-xl relative overflow-hidden group mb-8">
        <div className="absolute top-0 right-0 p-2 opacity-20"><Brain size={48} /></div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 bg-cyan rounded-full animate-pulse" />
          <span className="text-[10px] font-display text-cyan uppercase tracking-[0.2em] font-bold">Preview instance</span>
        </div>
        <p className="text-sm font-mono leading-relaxed text-cyan/90">{previewDraft}</p>
      </div>

      <div className="flex gap-4">
        <button onClick={() => setStep(3)} className="flex-1 border border-white/10 py-3.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all text-text-muted">
          TUNE
        </button>
        <button 
          onClick={handleComplete}
          disabled={loading}
          className="flex-[2] bg-cyan text-bg-void py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)]"
        >
          {loading ? 'INITIALIZING...' : 'DEPLOY TWIN'}
        </button>
      </div>
    </motion.div>
  );
}
