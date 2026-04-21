'use client';

import { useState, useEffect, useRef } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase-client";
import type { UserProfile, UIMessage } from "@/types/twin";
import { Send, Brain, Shield, Info, Database, ThumbsUp, ThumbsDown, X } from "lucide-react";
import { VoiceBridge } from "@/components/VoiceBridge";
import { ParticleNetwork } from "@/components/ParticleNetwork";
import { LearningProgress } from "@/components/LearningProgress";
import { LearningToast } from "@/components/LearningToast";
import { PresenceOrb } from "@/components/PresenceOrb";
import { WorkReport } from "@/components/dashboard/WorkReport";

// ── UI Sub-components ──

// HologramStage removed in favor of PresenceOrb integration

// ── Main Dashboard Page ──

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const [, setProfile] = useState<UserProfile | null>(null);
  
  // State
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [learningProgress, setLearningProgress] = useState(3);
  const [toastFact, setToastFact] = useState('');
  const [, setToastVisible] = useState(false);
  const [voiceState, setVoiceState] = useState('disconnected');
  const [feedbackMessage, setFeedbackMessage] = useState<{ index: number; traceId: string } | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isWorkReportOpen, setIsWorkReportOpen] = useState(false);
  const [orbState, setOrbState] = useState<'idle' | 'listening' | 'thinking' | 'speaking' | 'learning' | 'researching'>('idle');

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load Profile
  useEffect(() => {
    if (!userLoaded || !user?.id) return;
    async function loadData() {
      try {
        setProfile(record as unknown as UserProfile);
      } catch {
        router.push("/onboard");
      }
    }
    void loadData();
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
    setFeedbackMessage(null); // Clear any open feedback
    setIsLoading(true);
    setOrbState('thinking');

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
          return [...newHistory, { role: 'twin', content: twinReply.slice(0, currentIdx + 1), traceId: data.traceId }];
        });
        currentIdx++;
        if (currentIdx >= twinReply.length) {
          clearInterval(interval);
          setIsLoading(false);
          setOrbState('idle');
          
          // Trigger Learning Toast randomly for demo
          if (messages.length % 4 === 0) {
            setToastFact(userMsg.slice(0, 30) + "...");
            setToastVisible(true);
            setTimeout(() => setToastVisible(false), 4000);
            setLearningProgress(p => Math.min(100, p + 1));
          }
        }
      }, 20);

    } catch {
      setMessages(prev => [...prev, { role: 'twin', content: "SYSTEM ERROR: DATA STREAM INTERRUPTED." }]);
      setIsLoading(false);
      setOrbState('idle');
    }
  };

  const submitFeedback = async (rating: number, tags: string[] = []) => {
    if (!feedbackMessage || isSubmittingFeedback) return;
    setIsSubmittingFeedback(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traceId: feedbackMessage.traceId,
          rating,
          tags,
          userId: user?.id,
          metadata: {
             timestamp: new Date().toISOString(),
             url: window.location.href
          }
        })
      });
      setFeedbackMessage(null);
    } catch (err) {
      console.error('Feedback error:', err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Sync Voice State to Orb
  useEffect(() => {
    if (voiceState === 'listening') setOrbState('listening');
    else if (voiceState === 'speaking') setOrbState('speaking');
    else if (voiceState === 'disconnected' && orbState !== 'thinking' && orbState !== 'researching') setOrbState('idle');
  }, [voiceState, orbState]);

  const triggerResearch = async () => {
    if (!user?.id) return;
    setOrbState('researching');
    try {
      await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'RESEARCH_TASK', user_id: user.id })
      });
      // For demo, keep it researching for 3 seconds
      setTimeout(() => setOrbState('idle'), 3000);
    } catch (err) {
      console.error('Research trigger failed:', err);
      setOrbState('idle');
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden text-text-primary bg-transparent font-body relative">
      <ParticleNetwork count={80} />
      <LearningToast fact={toastFact} />
      <WorkReport 
        isOpen={isWorkReportOpen} 
        onClose={() => setIsWorkReportOpen(false)} 
        userId={user?.id || ''} 
      />
      
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
          <div onClick={() => setIsWorkReportOpen(true)}>
            <PresenceOrb state={orbState} />
          </div>
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center">
            <p className="font-display text-[10px] text-cyan/40 uppercase tracking-[0.4em] mb-2">Cognitive Link Status</p>
            <div className="flex items-center gap-2 justify-center">
               <button 
                 onClick={(e) => { e.stopPropagation(); void triggerResearch(); }}
                 className="text-[9px] font-display text-cyan hover:text-white transition-all uppercase tracking-widest border border-cyan/20 px-2 py-1 rounded bg-cyan/5"
               >
                 Pulse Research
               </button>
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
                className={`flex group ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
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
                  
                  {m.role === 'twin' && m.traceId && (
                    <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                         onClick={() => { setFeedbackMessage({ index: i, traceId: m.traceId! }); void submitFeedback(1); }}
                         className="p-1 hover:text-cyan transition-colors"
                       >
                         <ThumbsUp size={12} />
                       </button>
                       <button 
                         onClick={() => setFeedbackMessage({ index: i, traceId: m.traceId! })}
                         className="p-1 hover:text-red-400 transition-colors"
                       >
                         <ThumbsDown size={12} />
                       </button>
                    </div>
                  )}

                  {feedbackMessage?.index === i && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 glass border border-white/10 rounded-xl max-w-xs"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] uppercase tracking-widest text-cyan">Quality Feedback</span>
                        <button onClick={() => setFeedbackMessage(null)}><X size={12} /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {['wrong_memory', 'bad_tool', 'too_verbose', 'missed_context'].map(tag => (
                          <button 
                            key={tag}
                            onClick={() => submitFeedback(-1, [tag])}
                            className="text-[9px] py-1 px-2 border border-white/5 bg-white/5 hover:bg-cyan/10 hover:border-cyan/30 transition-all rounded uppercase"
                          >
                            {tag.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                      <p className="text-[8px] text-text-muted italic">Selecting a reason helps your twin learn faster.</p>
                    </motion.div>
                  )}
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
