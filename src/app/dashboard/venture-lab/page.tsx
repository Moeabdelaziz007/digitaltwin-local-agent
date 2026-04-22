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
  Clock
} from 'lucide-react';
import { ParticleNetwork } from '@/components/ParticleNetwork';
import { NeuralScanOverlay } from '@/components/NeuralScanOverlay';

const STAGES = [
  { id: 'Explore', label: 'The Prism', icon: Search, color: 'text-cyan', desc: 'Market Refraction' },
  { id: 'Collapse', label: 'The Synapse', icon: Layers, color: 'text-purple-400', desc: 'Neural Integration' },
  { id: 'Attack', label: 'The Crucible', icon: Target, color: 'text-red-400', desc: 'Strategy Smelting' },
  { id: 'Build', label: 'Kinetic Edge', icon: Zap, color: 'text-yellow-400', desc: 'Rapid Execution' },
  { id: 'Synthesis', label: 'The CEO', icon: ShieldCheck, color: 'text-green-400', desc: 'Final Orchestration' }
];

const AGENTS = [
  { name: 'Hunter', role: 'Explore' }, { name: 'Forager', role: 'Explore' }, { name: 'Miner', role: 'Explore' },
  { name: 'Cache', role: 'Collapse' }, { name: 'Conductor', role: 'Collapse' },
  { name: 'Advocate', role: 'Attack' }, { name: 'MarketSim', role: 'Attack' }, { name: 'Mirror', role: 'Attack' },
  { name: 'BuildSim', role: 'Build' }, { name: 'RevSim', role: 'Build' }, { name: 'Architect', role: 'Build' },
  { name: 'Blacksmith', role: 'Synthesis' }, { name: 'CEO', role: 'Synthesis' }, { name: 'Archivist', role: 'Synthesis' }
];

import { MemoryCanvas } from '@/components/MemoryCanvas';
import { useUser } from '@clerk/nextjs';
import pb from '@/lib/pocketbase-client';

interface UserProfile {
  id: string;
  user_id: string;
  skills: string[];
  interests: string[];
  bio?: string;
  name?: string;
}

export default function VentureLabDashboard() {
  const { user } = useUser();
  const [activeStage, setActiveStage] = useState('Explore');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (user?.id) {
      pb.collection('user_profiles').getFirstListItem(`user_id = "${user.id}"`)
        .then(setProfile)
        .catch(console.error);
    }
  }, [user?.id]);
  useEffect(() => {
    // Simulate real-time progress
    const stages = STAGES.map(s => s.id);
    const timer = setInterval(() => {
      const nextIdx = (stages.indexOf(activeStage) + 1) % stages.length;
      setActiveStage(stages[nextIdx]);
    }, 8000);
    return () => clearInterval(timer);
  }, [activeStage]);

  return (
    <div className="relative min-h-screen bg-[#06060A] text-white p-8 overflow-hidden">
      <ParticleNetwork />
      <NeuralScanOverlay />

      <header className="relative z-10 mb-12 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Rocket className="text-cyan animate-pulse" size={24} />
            <h1 className="text-3xl font-display font-bold tracking-tighter uppercase italic">
              Venture Lab <span className="text-cyan/50">v3.5</span>
            </h1>
          </div>
          <p className="text-text-muted text-xs font-display tracking-[0.2em] uppercase">
            Autonomous Alpha Generation Engine
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="block text-[8px] uppercase tracking-widest text-text-muted mb-1">System Health</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-4 h-1 bg-cyan shadow-[0_0_5px_#00f0ff]" />)}
            </div>
          </div>
          <div className="h-10 w-px bg-white/10" />
          <div className="text-right">
            <span className="block text-[8px] uppercase tracking-widest text-text-muted mb-1">Live Agents</span>
            <span className="font-display text-xl font-bold text-white">14 / 14</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8 relative z-10">
        {/* --- MAIN STAGE FLOW --- */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <div className="glass-surface p-8 rounded-3xl border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Activity size={120} />
            </div>
            
            <h2 className="text-[10px] uppercase tracking-[0.4em] text-cyan mb-8 font-bold">Neural Hierarchy Progression</h2>
            
            <div className="flex justify-between items-center relative">
              <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-y-1/2" />
              
              {STAGES.map((stage, idx) => {
                const Icon = stage.icon;
                const isActive = activeStage === stage.id;
                const isPast = STAGES.findIndex(s => s.id === activeStage) > idx;

                return (
                  <div key={stage.id} className="relative z-10 flex flex-col items-center gap-4">
                    <motion.div 
                      animate={isActive ? { scale: [1, 1.1, 1], boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)' } : {}}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                        isActive ? 'bg-cyan text-bg-void shadow-[0_0_30px_#00f0ff]' : 
                        isPast ? 'bg-white/10 text-cyan' : 'bg-white/5 text-text-muted'
                      }`}
                    >
                      <Icon size={24} />
                    </motion.div>
                    <div className="text-center">
                      <span className={`block font-display text-[9px] uppercase tracking-widest font-bold mb-1 ${isActive ? 'text-white' : 'text-text-muted'}`}>
                        {stage.label}
                      </span>
                      <span className="block text-[7px] text-text-muted/60 uppercase tracking-tighter">
                        {stage.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="glass-surface p-6 rounded-3xl border-white/5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[9px] uppercase tracking-widest text-text-muted font-bold">Agent Neural Cloud</h3>
                <span className="text-[8px] text-cyan animate-pulse">Scanning...</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {AGENTS.map((agent) => (
                  <div 
                    key={agent.name}
                    className={`px-3 py-1.5 rounded-lg border text-[8px] font-bold uppercase tracking-widest transition-all duration-500 ${
                      agent.role === activeStage 
                        ? 'bg-cyan/10 border-cyan text-cyan shadow-[0_0_10px_rgba(0,240,255,0.1)]' 
                        : 'bg-white/5 border-white/5 text-text-muted/40'
                    }`}
                  >
                    {agent.name}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-surface p-6 rounded-3xl border-white/5">
              <h3 className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-6">Active Insights</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1 animate-pulse" />
                  <div>
                    <p className="text-[10px] text-white/90">Revenue Mirror: Slippage detected in L2 pairs.</p>
                    <span className="text-[8px] text-text-muted">Adjusting Monte Carlo params...</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1" />
                  <div>
                    <p className="text-[10px] text-white/90">The Prism: New High-Velocity Gem found.</p>
                    <span className="text-[8px] text-text-muted">Venture ID: 0xFX-92</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <MemoryCanvas 
            skills={profile?.skills || ['Neural-Link', 'Sovereign-Logic', 'Synthesis']} 
            interests={profile?.interests || ['Artificial Intelligence', 'Wealth-Gen', 'Privacy']} 
          />
        </div>

        {/* --- SIDEBAR: OPPORTUNITIES --- */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          <div className="glass-surface p-6 rounded-3xl border-white/5 min-h-[600px] flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-[10px] uppercase tracking-[0.3em] text-cyan font-bold">Hidden Gems</h3>
              <TrendingUp size={16} className="text-cyan/40" />
            </div>

            <div className="flex-1 space-y-4">
              {/* Mock Opportunities */}
              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-cyan/30 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[9px] px-2 py-0.5 bg-cyan/10 text-cyan rounded border border-cyan/20 font-bold uppercase tracking-widest">Arbitrage</span>
                  <span className="text-[10px] font-bold text-white">$1,420/mo</span>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-cyan transition-colors mb-2 italic">ETH/USDC Cross-Chain Mirror</h4>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan w-[88%]" />
                  </div>
                  <span className="text-[8px] font-bold text-cyan">88% Match</span>
                </div>
              </div>

              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-cyan/30 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[9px] px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded border border-purple-500/20 font-bold uppercase tracking-widest">SaaS</span>
                  <span className="text-[10px] font-bold text-white">$4,500/mo</span>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors mb-2 italic">AI-First Privacy Proxy</h4>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 w-[62%]" />
                  </div>
                  <span className="text-[8px] font-bold text-purple-400">62% Match</span>
                </div>
              </div>
            </div>

            <button className="w-full mt-8 py-3 rounded-xl border border-white/5 text-[9px] uppercase tracking-widest text-text-muted hover:bg-white/5 transition-all">
              Initialize New Venture Run
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
