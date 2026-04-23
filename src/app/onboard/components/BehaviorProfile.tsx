'use client';

import { motion } from 'framer-motion';
import { Brain, ArrowLeft } from 'lucide-react';
import { TerminalIntro } from '@/components/TerminalIntro';

const STYLE_CHIPS = [
  { id: 'concise', label: 'Short & direct', icon: '⚡' },
  { id: 'detailed', label: 'Deep & explanatory', icon: '📚' },
  { id: 'witty', label: 'Humorous', icon: '🎭' },
  { id: 'serious', label: 'Professional', icon: '👔' },
  { id: 'mentor', label: 'Guiding', icon: '🎓' },
  { id: 'friend', label: 'Casual friend', icon: '🤝' }
];

interface BehaviorProfileProps {
  selectedStyles: string[];
  setSelectedStyles: (l: string[]) => void;
  extraPrefs: string;
  setExtraPrefs: (val: string) => void;
  generatePreview: () => void;
  prevStep: () => void;
  loading: boolean;
}

export function BehaviorProfile({ selectedStyles, setSelectedStyles, extraPrefs, setExtraPrefs, generatePreview, prevStep, loading }: BehaviorProfileProps) {
  const toggleStyle = (id: string) => {
    setSelectedStyles(selectedStyles.includes(id) ? selectedStyles.filter(t => t !== id) : [...selectedStyles, id]);
  };

  return (
    <motion.div 
      key="step3"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="glass p-8 rounded-2xl border border-white/10"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-cyan/10 flex items-center justify-center text-cyan">
          <Brain size={20} />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold tracking-tight">BEHAVIOR PROFILE</h1>
          <TerminalIntro text="CALIBRATING RESPONSE TONE..." />
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-cyan/60 mb-4">Response Modality</label>
          <div className="grid grid-cols-2 gap-3">
            {STYLE_CHIPS.map(chip => (
              <button 
                key={chip.id}
                onClick={() => toggleStyle(chip.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  selectedStyles.includes(chip.id) 
                    ? 'bg-cyan/10 border-cyan text-white shadow-[0_0_15px_rgba(0,240,255,0.1)]' 
                    : 'bg-white/5 border-white/5 text-text-muted hover:border-white/20'
                }`}
              >
                <span className="text-lg">{chip.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-tight">{chip.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-cyan/60 mb-2">Constraint Overrides</label>
          <textarea 
            value={extraPrefs}
            onChange={(e) => setExtraPrefs(e.target.value)}
            placeholder="Specific rules or preferences..."
            className="w-full h-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/20 transition-all font-mono resize-none"
          />
        </div>
      </div>

      <div className="flex gap-4 mt-8">
        <button onClick={prevStep} className="flex-1 border border-white/10 py-3.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all text-text-muted flex items-center justify-center gap-2">
          <ArrowLeft size={14} /> Back
        </button>
        <button 
          onClick={generatePreview}
          disabled={loading}
          className="flex-[2] bg-cyan text-bg-void py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'CALIBRATING...' : 'GENERATE PREVIEW'}
        </button>
      </div>
    </motion.div>
  );
}
