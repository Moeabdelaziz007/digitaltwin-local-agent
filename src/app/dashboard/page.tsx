'use client';

import { useState, useEffect, useRef } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase-client";
import type { UserProfile } from "@/types/twin";
import { Send, Brain, Shield, Info, Database } from "lucide-react";
import { VoiceBridge } from "@/components/VoiceBridge";
import { ParticleNetwork } from "@/components/ParticleNetwork";
import { LearningProgress } from "@/components/LearningProgress";
import { LearningToast } from "@/components/LearningToast";

// ── UI Sub-components ──

const HologramStage = ({ voiceState }: { voiceState: string }) => {
  const isSpeaking = voiceState === 'speaking';
  const isListening = voiceState === 'listening';
  
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan/5 to-bg-void pointer-events-none" />
      <div className="relative w-64 h-64 perspective-1000">
         <div className={`absolute inset-0 border rounded-full animate-[hologram-spin_10s_linear_infinite] ${isSpeaking ? 'border-amber/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'border-cyan/20'}`} 
              style={{ transform: 'rotateX(75deg)' }} />
         <div className={`absolute inset-4 border rounded-full animate-[hologram-spin_15s_linear_infinite_reverse] ${isSpeaking ? 'border-amber/60' : isListening ? 'border-cyan/60 shadow-[0_0_30px_rgba(0,240,255,0.2)]' : 'border-violet/30'}`} 
              style={{ transform: 'rotateX(75deg)' }} />
         <div className="z-10 absolute inset-0 flex items-center justify-center">
            <div className={`w-32 h-32 rounded-full glass border p-1 ${isSpeaking ? 'border-amber/40 animate-pulse' : 'border-cyan/40 animate-pulse'}`}>
              <div className={`w-full h-full rounded-full flex items-center justify-center ${isSpeaking ? 'bg-amber/10' : 'bg-cyan/10'}`}>
                <svg width="40" height="40" viewBox="0 0 100 100" className={isSpeaking ? 'text-amber' : 'text-cyan'}>
                  <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="none" stroke="currentColor" strokeWidth="4" />
                  <circle cx="50" cy="50" r="10" fill="currentColor" className={isSpeaking ? 'animate-ping' : isListening ? 'animate-bounce' : 'animate-ping'} />
                </svg>
              </div>
            </div>
         </div>
      </div>
    </div>
  );
};

// ── Main Dashboard Page ──

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const [_profile, setProfile] = useState<UserProfile | null>(null);
  
  // State
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'twin', content: string }>>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [learningProgress, setLearningProgress] = useState(3);
  const [toastFact, setToastFact] = useState('');
  const [_toastVisible, setToastVisible] = useState(false);
  const [voiceState, setVoiceState] = useState('disconnected');

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load Profile
  useEffect(() => {
    if (!userLoaded || !user?.id) return;
    async function loadData() {
      try {
        const record = await pb.collection("user_profiles").getFirstListItem(`user_id="${user?.id}"`);
        setProfile(record as unknown as UserProfile);
      } catch (_e) {
        router.push("/onboard");
      }
    }
    loadData();
  }, [user?.id, userLoaded, router]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle Send
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading || !user?.id) return;

    const userMsg = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, userId: user.id })
      });

      if (!response.ok) throw new Error("Connection lost");
      const data = await response.json();
      
      // Atomic response logic for POST mode
      // (Future: Upgrade to stream reader here for char-by-char)
      const twinReply = data.reply || "... (No response)";
      
      // Typewriter Effect logic
      let currentIdx = 0;
      setMessages(prev => [...prev, { role: 'twin', content: '' }]);
      
      const interval = setInterval(() => {
        setMessages(prev => {
          const newHistory = prev.slice(0, -1);
          return [...newHistory, { role: 'twin', content: twinReply.slice(0, currentIdx + 1) }];
        });
        currentIdx++;
        if (currentIdx >= twinReply.length) {
          clearInterval(interval);
          setIsLoading(false);
          
          // Trigger Learning Toast randomly for demo
          if (messages.length % 4 === 0) {
            setToastFact(userMsg.slice(0, 30) + "...");
            setToastVisible(true);
            setTimeout(() => setToastVisible(false), 4000);
            setLearningProgress(p => Math.min(100, p + 1));
          }
        }
      }, 20);

    } catch (_err) {
      setMessages(prev => [...prev, { role: 'twin', content: "SYSTEM ERROR: DATA STREAM INTERRUPTED." }]);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden text-text-primary bg-transparent font-body relative">
      <ParticleNetwork count={80} />
      <LearningToast fact={toastFact} />
      
      {/* ── Header ── */}
      <header className="h-12 border-b border-white/5 px-6 flex items-center justify-between glass shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 100 100" className="text-cyan">
              <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="none" stroke="currentColor" strokeWidth="8" />
            </svg>
            <span className="font-display font-bold text-xs tracking-tighter uppercase">Digital Twin v2.1</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan/10 rounded-full">
            <div className="w-1.5 h-1.5 bg-cyan rounded-full animate-pulse" />
            <span className="text-[10px] font-display text-cyan uppercase font-bold tracking-widest">Online</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="text-text-muted magnetic-icon"><Database size={16} /></button>
          <button className="text-text-muted magnetic-icon"><Shield size={16} /></button>
          <button onClick={() => router.push('/settings')} className="text-text-muted magnetic-icon"><Info size={16} /></button>
          <div className="h-6 w-[1px] bg-white/10 mx-2" />
          <UserButton />
        </div>
      </header>

      {/* ── Main Layout (Flex) ── */}
      <main className="flex flex-1 overflow-hidden">
        {/* Avatar Stage (50%) */}
        <section className="hidden md:flex flex-[0.5] border-r border-white/5 bg-bg-surface/30 relative items-center justify-center">
          <HologramStage voiceState={voiceState} />
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center">
            <p className="font-display text-[10px] text-cyan/40 uppercase tracking-[0.4em] mb-2">Cognitive Link Status</p>
            <div className="flex items-center gap-1 justify-center">
               {[...Array(5)].map((_, i) => (
                 <motion.div 
                   key={i}
                   animate={{ scaleY: [1, 2, 1], opacity: [0.3, 0.6, 0.3] }}
                   transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                   className="w-[2px] h-3 bg-cyan"
                 />
               ))}
            </div>
          </div>
        </section>

        {/* Transcript Panel */}
        <section className="flex-1 flex flex-col bg-bg-void/50 relative overflow-hidden">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 scrollbar-thin scrollbar-thumb-cyan/20 scrollbar-track-transparent"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                <Brain size={48} className="mb-4" />
                <p className="font-display text-sm uppercase tracking-[0.2em]">Neural link awaiting input...</p>
              </div>
            )}
            
            {messages.map((m, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] md:max-w-[70%] ${m.role === 'user' ? 'order-1' : 'order-2'}`}>
                  <div className={`p-4 rounded-xl text-sm leading-relaxed ${
                    m.role === 'user' 
                      ? 'chat-user text-white' 
                      : 'chat-twin text-text-primary'
                  }`}>
                    {m.content}
                    {isLoading && i === messages.length - 1 && m.role === 'twin' && (
                       <span className="inline-block w-1 h-4 bg-cyan animate-pulse ml-1 align-middle" />
                    )}
                  </div>
                  <p className={`text-[10px] font-display mt-2 opacity-30 uppercase tracking-widest ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {m.role === 'user' ? 'Authored By User' : 'Generated Instance'}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* ── Controls (80px) ── */}
      <footer className="h-20 border-t border-white/5 glass px-4 md:px-8 flex items-center gap-4 shrink-0 transition-all">
        <VoiceBridge onStateChange={setVoiceState} />
        
        <form onSubmit={handleSend} className="flex-1 relative">
          <input 
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message to your twin..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-6 py-3 text-sm focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/20 transition-all disabled:opacity-50"
            disabled={isLoading}
          />
          <button 
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan hover:scale-110 transition-all disabled:opacity-30"
            disabled={isLoading || !inputValue.trim()}
          >
            <Send size={18} />
          </button>
        </form>

        <div className="flex flex-col items-center shrink-0">
          <LearningProgress value={learningProgress} />
          <span className="text-[8px] font-display text-text-muted uppercase tracking-tighter mt-1 font-bold">Evolution</span>
        </div>
      </footer>
    </div>
  );
}
