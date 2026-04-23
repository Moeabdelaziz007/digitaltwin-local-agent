'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, 
  Target, 
  Zap, 
  ShieldCheck, 
  Activity, 
  Search, 
  TrendingUp, 
  Layers,
  ChevronRight,
  AlertCircle,
  Clock,
  Sparkles,
  Database
} from 'lucide-react';
import { ParticleNetwork } from '@/components/ParticleNetwork';
import { NeuralScanOverlay } from '@/components/NeuralScanOverlay';
import { Venture } from '@/lib/holding/types';

const STAGES = [
  { id: 'Explore', label: 'The Prism', icon: Search, color: 'text-cyan', desc: 'Market Refraction' },
  { id: 'Collapse', label: 'The Synapse', icon: Layers, color: 'text-purple-400', desc: 'Neural Integration' },
  { id: 'Attack', label: 'The Crucible', icon: Target, color: 'text-red-400', desc: 'Strategy Smelting' },
  { id: 'Build', label: 'Kinetic Edge', icon: Zap, color: 'text-yellow-400', desc: 'Rapid Execution' },
  { id: 'Synthesis', label: 'The CEO', icon: ShieldCheck, color: 'text-green-400', desc: 'Final Orchestration' }
];

const SUPERPOWERS = [
  { name: 'The Expert Validator', type: 'Composite', impact: 'Critical', active: true },
  { name: 'Revenue Flywheel', type: 'Loop', impact: 'High', active: true },
  { name: 'Mirage Protocol', type: 'Stealth', impact: 'Tactical', active: true },
  { name: 'Guardian Shield', type: 'Security', impact: 'Medium', active: true }
];

export default function VentureLabDashboard() {
  const [activeStage, setActiveStage] = useState('Explore');
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVentures = async () => {
      try {
        const res = await fetch('/api/ventures');
        const data = await res.json();
        if (data.ventures) setVentures(data.ventures);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchVentures();
  }, []);

  useEffect(() => {
    const stages = STAGES.map(s => s.id);
    const timer = setInterval(() => {
      const nextIdx = (stages.indexOf(activeStage) + 1) % stages.length;
      setActiveStage(stages[nextIdx]);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeStage]);

  return (
    <div className="relative min-h-screen bg-[#06060A] text-white p-8 overflow-hidden custom-scrollbar">
      <ParticleNetwork />
      <NeuralScanOverlay />

      <header className="relative z-10 mb-12 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan/10 rounded-xl border border-cyan/20">
              <Sparkles className="text-cyan animate-pulse" size={24} />
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tighter uppercase italic">
              Venture Lab <span className="text-cyan/50">v4.0</span>
            </h1>
          </div>
          <p className="text-text-muted text-[10px] font-display tracking-[0.4em] uppercase">
            Autonomous Enterprise Operating System
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="block text-[8px] uppercase tracking-widest text-text-muted mb-1">Core Health</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-4 h-1 bg-cyan shadow-[0_0_5px_#00f0ff]" />)}
            </div>
          </div>
          <div className="h-10 w-px bg-white/10" />
          <div className="text-right">
            <span className="block text-[8px] uppercase tracking-widest text-text-muted mb-1">Active Ventures</span>
            <span className="font-display text-xl font-bold text-white">{ventures.length}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8 relative z-10">
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Progression Map */}
          <div className="glass-surface p-8 rounded-3xl border-white/5 relative overflow-hidden bg-white/5">
            <h2 className="text-[10px] uppercase tracking-[0.4em] text-cyan mb-12 font-bold">8-Step Execution Lifecycle</h2>
            
            <div className="flex justify-between items-center relative">
              <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/5 -translate-y-1/2" />
              
              {STAGES.map((stage, idx) => {
                const Icon = stage.icon;
                const isActive = activeStage === stage.id;
                return (
                  <div key={stage.id} className="relative z-10 flex flex-col items-center gap-4">
                    <motion.div 
                      animate={isActive ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-700 ${
                        isActive ? 'bg-cyan text-bg-void shadow-[0_0_40px_rgba(0,240,255,0.4)]' : 'bg-white/5 text-text-muted border border-white/5'
                      }`}
                    >
                      <Icon size={24} />
                    </motion.div>
                    <div className="text-center">
                      <span className={`block font-display text-[9px] uppercase tracking-widest font-bold ${isActive ? 'text-white' : 'text-text-muted'}`}>
                        {stage.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Superpowers Panel */}
            <div className="glass-surface p-6 rounded-3xl border-white/5 bg-white/5">
              <h3 className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-6 flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-400" />
                Active Superpowers
              </h3>
              <div className="space-y-3">
                {SUPERPOWERS.map(p => (
                  <div key={p.name} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-cyan/30 transition-all">
                    <div>
                      <p className="text-[10px] font-bold text-white/90 group-hover:text-cyan transition-colors">{p.name}</p>
                      <span className="text-[8px] text-text-muted uppercase tracking-tighter">{p.type} Layer</span>
                    </div>
                    <div className="text-[8px] font-bold text-emerald-400 px-2 py-0.5 bg-emerald-400/10 rounded">{p.impact}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Insights */}
            <div className="glass-surface p-6 rounded-3xl border-white/5 bg-white/5">
              <h3 className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-6">Neural Insights</h3>
              <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-xl border-l-2 border-l-cyan flex gap-3">
                   <div className="w-1 h-1 rounded-full bg-cyan mt-1 animate-ping" />
                   <p className="text-[10px] text-white/70 leading-relaxed italic">"Mercor expertise matched for Venture Alpha. Estimated ROI: 20% Life-time."</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border-l-2 border-l-purple-500 flex gap-3">
                   <div className="w-1 h-1 rounded-full bg-purple-500 mt-1" />
                   <p className="text-[10px] text-white/70 leading-relaxed italic">"Bounty Hunter solution validated. Human review pending for V-012."</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: REAL ACTIVE VENTURES */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          <div className="glass-surface p-6 rounded-3xl border-white/5 bg-white/5 min-h-[500px] flex flex-col">
            <h3 className="text-[10px] uppercase tracking-[0.4em] text-cyan font-bold mb-8">Active Ventures</h3>
            <div className="space-y-4 flex-1">
              {ventures.map(v => (
                <div key={v.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl group hover:border-cyan/40 transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[9px] font-mono text-cyan/60">{v.id}</span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full">
                       <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                       <span className="text-[7px] text-emerald-500 font-bold uppercase tracking-widest">Active</span>
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-white/90 mb-1">{v.name}</h4>
                  <p className="text-[9px] text-white/30 uppercase tracking-widest mb-4">{v.metadata?.engine || 'Sovereign-Logic'}</p>
                  
                  <div className="flex items-center gap-3">
                     <div className="flex-1 h-[2px] bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan" style={{ width: '45%' }} />
                     </div>
                     <span className="text-[8px] font-bold text-cyan">$${v.budget.total_spent_usd}</span>
                  </div>
                </div>
              ))}
              {ventures.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-64 text-center opacity-20">
                  <Database size={32} className="mb-4" />
                  <p className="text-[10px] uppercase tracking-widest">No Active Vectors Found</p>
                </div>
              )}
            </div>

            <button className="w-full mt-8 py-4 bg-cyan/10 hover:bg-cyan/20 border border-cyan/20 rounded-2xl text-[9px] uppercase tracking-[0.3em] font-bold text-cyan transition-all">
              Initialize New Stream
            </button>
          </div>
        </div>
      </div>
      {/* --- FOOTER STATUS --- */}
      <footer className="fixed bottom-0 left-0 w-full p-4 bg-[#0A0A0F] border-t border-white/5 z-20 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
            <span className="text-[8px] uppercase tracking-widest text-text-muted">Neural Core: Active</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-[8px] uppercase tracking-widest text-text-muted">Last Block Sync:</span>
            <span className="text-[8px] font-mono text-cyan">0xFA2...8B1</span>
          </div>
        </div>
        <div className="font-display text-[7px] text-text-muted/30 tracking-[0.5em] uppercase">
          M.A.S-ZERO VENTURE PROTOCOL // 2026-R1
        </div>
      </footer>
    </div>
  );
}
