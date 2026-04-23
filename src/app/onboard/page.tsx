'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import pb from '@/lib/pocketbase-client';
import { motion, AnimatePresence } from 'framer-motion';
import { MatrixRain } from '@/components/MatrixRain';
import { TerminalIntro } from '@/components/TerminalIntro';
import { Shield } from 'lucide-react';

// Modular Components
import { IdentitySync } from './components/IdentitySync';
import { ProfessionalDNA } from './components/ProfessionalDNA';
import { BehaviorProfile } from './components/BehaviorProfile';
import { NeuralHandshake } from './components/NeuralHandshake';



export default function OnboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState("");
  const [goal, setGoal] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [extraPrefs, setExtraPrefs] = useState("");
  const [previewDraft, setPreviewDraft] = useState("");
  const [error, setError] = useState("");

  const nextStep = () => {
    if (step === 1) {
      if (displayName.trim().length < 2) return setError("SYSTEM: Name identifier too short.");
      if (goal.trim().length < 3) return setError("SYSTEM: Core objective undefined.");
    }
    if (step === 2) {
      if (skills.length === 0) return setError("SYSTEM: Professional DNA requires at least one skill.");
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

  const toggleItem = (item: string, list: string[], setList: (l: string[]) => void) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const generatePreview = () => {
    setLoading(true);
    setTimeout(() => {
      setPreviewDraft(
        `"Initialize protocol for ${displayName}. I will maintain a ${selectedStyles.join(", ") || "balanced"} persona while pursuing the objective: ${goal}. Professional DNA: ${skills.join(", ")}."`
      );
      setLoading(false);
      setStep(4);
    }, 1200);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const clerkUserId = user?.id?.trim();
      if (!clerkUserId) throw new Error("AUTH CRITICAL: SESSION LOST");

      const mainMd = `# MyDigitalTwin Core\nUser: ${displayName}\nRole: ${goal}`;
      const soulMd = `# Identity & Tone\nStyles: ${selectedStyles.join(", ")}\nSkills: ${skills.join(", ")}\nInterests: ${interests.join(", ")}`;
      const guardsMd = `# Boundaries\n- No generic AI talk\n- Maintain sovereign persona`;

      try {
        const existing = await pb.collection("user_profiles").getFirstListItem(`user_id = "${clerkUserId}"`) as any;
        await pb.collection("user_profiles").update(existing.id, {
          display_name: displayName.trim(),
          personality_desc: goal.trim(),
          tone: selectedStyles[0] || "friendly",
          skills,
          interests,
          context_main: mainMd,
          context_soul: soulMd,
          context_guards: guardsMd,
          onboarding_complete: true,
        });
      } catch {
        await pb.collection("user_profiles").create({
          user_id: clerkUserId,
          display_name: displayName.trim(),
          personality_desc: goal.trim(),
          tone: selectedStyles[0] || "friendly",
          skills,
          interests,
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
          {[1, 2, 3, 4].map((s) => (
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
            <IdentitySync 
              displayName={displayName}
              setDisplayName={setDisplayName}
              goal={goal}
              setGoal={setGoal}
              nextStep={nextStep}
            />
          )}

          {step === 2 && (
            <ProfessionalDNA 
              skills={skills}
              setSkills={setSkills}
              interests={interests}
              setInterests={setInterests}
              nextStep={nextStep}
              prevStep={prevStep}
            />
          )}

          {step === 3 && (
            <BehaviorProfile 
              selectedStyles={selectedStyles}
              setSelectedStyles={setSelectedStyles}
              extraPrefs={extraPrefs}
              setExtraPrefs={setExtraPrefs}
              generatePreview={generatePreview}
              prevStep={prevStep}
              loading={loading}
            />
          )}

          {step === 4 && (
            <NeuralHandshake 
              previewDraft={previewDraft}
              handleComplete={handleComplete}
              setStep={setStep}
              loading={loading}
            />
          )}
        </AnimatePresence>

        <div className="mt-12 text-center">
          <p className="text-[9px] uppercase tracking-[0.4em] text-white/20">Protocol: MyDigitalTwin Sovereign Engine v2.1</p>
        </div>
      </motion.div>
    </main>
  );
}
