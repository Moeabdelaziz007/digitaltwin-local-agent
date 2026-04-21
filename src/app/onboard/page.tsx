'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import pb from '@/lib/pocketbase-client';
import { motion, AnimatePresence } from 'framer-motion';
import { MatrixRain } from '@/components/MatrixRain';
import { TerminalIntro } from '@/components/TerminalIntro';
import { Brain, Cpu, Shield, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

const STYLE_CHIPS = [
  { id: 'concise', label: 'Short & direct', icon: '⚡' },
  { id: 'detailed', label: 'Deep & explanatory', icon: '📚' },
  { id: 'witty', label: 'Humorous', icon: '🎭' },
  { id: 'serious', label: 'Professional', icon: '👔' },
  { id: 'mentor', label: 'Guiding', icon: '🎓' },
  { id: 'friend', label: 'Casual friend', icon: '🤝' }
];

export default function OnboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState("");
  const [goal, setGoal] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [extraPrefs, setExtraPrefs] = useState("");
  const [previewDraft, setPreviewDraft] = useState("");
  const [error, setError] = useState("");

  const nextStep = () => {
    if (step === 1) {
      if (displayName.trim().length < 2) return setError("SYSTEM: Name identifier too short.");
      if (goal.trim().length < 3) return setError("SYSTEM: Core objective undefined.");
    }
    setError("");
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setError("");
    setStep(prev => prev - 1);
  };

  const toggleStyle = (id: string) => {
    setSelectedStyles(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const generatePreview = () => {
    setLoading(true);
    setTimeout(() => {
      setPreviewDraft(
        `"Initialize protocol for ${displayName}. I will maintain a ${selectedStyles.join(", ") || "balanced"} persona while pursuing the objective: ${goal}."`
      );
      setLoading(false);
      setStep(3);
    }, 1200);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const userId = user?.id;
      if (!userId) throw new Error("AUTH CRITICAL: SESSION LOST");

      const mainMd = `# MyDigitalTwin Core\nUser: ${displayName}\nRole: ${goal}`;
      const soulMd = `# Identity & Tone\nStyles: ${selectedStyles.join(", ")}\nPrefs: ${extraPrefs}`;
      const guardsMd = `# Boundaries\n- No generic AI talk\n- Maintain sovereign persona`;

      try {
        const existing = await pb.collection("user_profiles").getFirstListItem(`user_id = "${userId}"`);
        await pb.collection("user_profiles").update(existing.id, {
          display_name: displayName.trim(),
          personality_desc: goal.trim(),
          tone: selectedStyles[0] || "friendly",
          context_main: mainMd,
          context_soul: soulMd,
          context_guards: guardsMd,
          onboarding_complete: true,
        });
      } catch {
        await pb.collection("user_profiles").create({
          user_id: userId,
          display_name: displayName.trim(),
          personality_desc: goal.trim(),
          tone: selectedStyles[0] || "friendly",
          context_main: mainMd,
          context_soul: soulMd,
          context_guards: guardsMd,
          onboarding_complete: true,
          learning_progress: 5,
        });
      }

      router.push("/dashboard");
    } catch {
      setError("UPLOAD ERROR: NEURAL LINK FAILED");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-bg-void flex items-center justify-center p-6 overflow-y-auto">
      <MatrixRain />
      
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg-void/40 to-bg-void pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-xl"
      >
        {/* Progress Bar */}
        <div className="flex gap-3 mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={false}
                animate={{ width: s <= step ? '100%' : '0%' }}
                className="h-full bg-cyan shadow-[0_0_10px_rgba(0,240,255,0.5)]"
              />
            </div>
          ))}
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono rounded-lg flex items-center gap-3"
          >
            <Shield size={16} /> {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
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
                    placeholder="e.g. Memory conservation, coding partner"
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
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
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
                  <TerminalIntro text="CALIBRATING AUDITORY RESPONSE..." />
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
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
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
                <button onClick={() => setStep(2)} className="flex-1 border border-white/10 py-3.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all text-text-muted">
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
          )}
        </AnimatePresence>

        <div className="mt-12 text-center">
          <p className="text-[9px] uppercase tracking-[0.4em] text-white/20">Protocol: MyDigitalTwin Sovereign Engine v2.1</p>
        </div>
      </motion.div>
    </main>
  );
}
