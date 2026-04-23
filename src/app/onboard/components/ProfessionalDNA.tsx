'use client';

import { motion } from 'framer-motion';
import { Fingerprint, ArrowRight, ArrowLeft } from 'lucide-react';
import { TerminalIntro } from '@/components/TerminalIntro';

const SKILL_SUGGESTIONS = ['Next.js', 'TypeScript', 'Crypto', 'Arbitrage', 'SaaS', 'Marketing', 'Data Analysis', 'Python'];
const INTEREST_SUGGESTIONS = ['AI', 'Passive Income', 'Cyberpunk', 'Privacy', 'Gaming', 'Finance', 'Open Source'];

interface ProfessionalDNAProps {
  skills: string[];
  setSkills: (l: string[]) => void;
  interests: string[];
  setInterests: (l: string[]) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function ProfessionalDNA({ skills, setSkills, interests, setInterests, nextStep, prevStep }: ProfessionalDNAProps) {
  const toggleItem = (item: string, list: string[], setList: (l: string[]) => void) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  return (
    <motion.div 
      key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="glass p-8 rounded-2xl border border-white/10"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-cyan/10 flex items-center justify-center text-cyan">
          <Fingerprint size={20} />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold tracking-tight">PROFESSIONAL DNA</h1>
          <TerminalIntro text="SCANNING SKILLS & INTERESTS..." />
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-cyan/60 mb-4">Core Skills</label>
          <div className="flex flex-wrap gap-2">
            {SKILL_SUGGESTIONS.map(skill => (
              <button 
                key={skill}
                onClick={() => toggleItem(skill, skills, setSkills)}
                className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                  skills.includes(skill) 
                    ? 'bg-cyan/10 border-cyan text-cyan' 
                    : 'bg-white/5 border-white/5 text-text-muted hover:border-white/20'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-cyan/60 mb-4">High-Interest Areas</label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_SUGGESTIONS.map(interest => (
              <button 
                key={interest}
                onClick={() => toggleItem(interest, interests, setInterests)}
                className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                  interests.includes(interest) 
                    ? 'bg-purple-500/10 border-purple-500 text-purple-400' 
                    : 'bg-white/5 border-white/5 text-text-muted hover:border-white/20'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4 mt-8">
        <button onClick={prevStep} className="flex-1 border border-white/10 py-3.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all text-text-muted flex items-center justify-center gap-2">
          <ArrowLeft size={14} /> Back
        </button>
        <button 
          onClick={nextStep}
          className="flex-[2] bg-cyan text-bg-void py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
        >
          Next Step <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  );
}
