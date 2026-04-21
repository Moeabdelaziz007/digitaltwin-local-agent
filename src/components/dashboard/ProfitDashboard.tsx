/**
 * /src/components/dashboard/ProfitDashboard.tsx
 * Premium Dashboard for the Autonomous Venture Lab.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Target, Cpu, Activity, Zap, DollarSign } from 'lucide-react';
import { VentureLabView } from './VentureLabView';
import { ConsensusVerdict } from '@/types/twin';

interface ProfitState {
  simulatedProfit: number;
  activeOpportunities: number;
  successRate: number;
  systemHealth: number;
}

export const ProfitDashboard: React.FC = () => {
  const [state, setState] = useState<ProfitState>({
    simulatedProfit: 12450.75,
    activeOpportunities: 3,
    successRate: 92.4,
    systemHealth: 98,
  });

  const [selectedVenture, setSelectedVenture] = useState<ConsensusVerdict | null>(null);

  // Mock data for testing the v3 View
  const openMockReport = () => {
    setSelectedVenture({
      final_answer: "### VENTURE BLUEPRINT: AGENTIC ARBITRAGE\n\n**Executive Summary**\nThe system identifies a 12% spread on ETH/USDC pairs across Base and Arbitrum during high-volatility events. By utilizing the MAS-ZERO Zero-Cost infrastructure, we can execute atomic swaps with near-zero operational overhead.\n\n**Strategy**\n1. Deploy Sensing Agents on Base/Arbitrum.\n2. Utilize local wallet for signing.\n3. Execute only when profit > gas * 2.",
      confidence: 0.94,
      risk: 'low',
      fallback_used: false,
      timed_out: false,
      latency_ms: 1200,
      disagreement: false,
      planner: { agent: 'planner', verdict: 'accept', output: '', confidence: 1, risk: 'low', reasoning_summary: '', issues: [] },
      critic: { agent: 'critic', verdict: 'accept', output: '', confidence: 1, risk: 'low', reasoning_summary: '', issues: [] },
      guardian: { agent: 'guardian', verdict: 'accept', output: '', confidence: 1, risk: 'low', reasoning_summary: '', issues: [] },
      risk_flags: { prompt_injection: false, hallucination_risk: false, privacy_leak_risk: false, policy_risk: false },
      is_venture_cycle: true,
      fragility_map: {
        "Gas Volatility": 45,
        "Slippage Risk": 22,
        "Liquidity Gap": 12,
        "Competitor Front-run": 78
      }
    });
  };

  return (
    <div className="p-6 space-y-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl text-white">
      <AnimatePresence>
        {selectedVenture && (
          <VentureLabView 
            verdict={selectedVenture} 
            onClose={() => setSelectedVenture(null)} 
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Autonomous Venture Lab
          </h2>
          <p className="text-white/50 text-sm mt-1">Real-time profit orchestration & causal intelligence</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-emerald-500 text-xs font-mono uppercase tracking-widest">Active</span>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          label="Simulated Profit" 
          value={`$${state.simulatedProfit.toLocaleString()}`} 
          icon={<DollarSign className="text-emerald-400" />}
          trend="+12% vs last batch"
        />
        <StatCard 
          label="Active Ventures" 
          value={state.activeOpportunities.toString()} 
          icon={<Target className="text-cyan-400" />}
        />
        <StatCard 
          label="MAS-ZERO Success" 
          value={`${state.successRate}%`} 
          icon={<Cpu className="text-purple-400" />}
        />
        <StatCard 
          label="System Health" 
          value={`${state.systemHealth}%`} 
          icon={<Activity className="text-blue-400" />}
        />
      </div>

      {/* Venture Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap size={18} className="text-yellow-400" />
            Live Opportunity Stream
          </h3>
          <div className="space-y-3">
            <OpportunityItem 
              title="L2 Cross-Chain Arbitrage (ETH/USDC)" 
              desc="Discrepancy detected between Base and Arbitrum. Net profit potential: $450/trade."
              tag="Crypto"
              score={94}
              onClick={openMockReport}
            />
            <OpportunityItem 
              title="Micro-SaaS Agentic Bridge" 
              desc="Market gap for local-first AI automation in legal tech. Builder agent drafting MVP."
              tag="SaaS"
              score={88}
              onClick={openMockReport}
            />
          </div>
        </div>

        {/* Causal Graph Preview (Simplified) */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-mono text-white/40 uppercase mb-4">Causal Profit Graph</h3>
            <div className="h-32 flex items-center justify-center border-b border-white/5 mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                  <TrendingUp size={24} className="text-emerald-500" />
                </div>
                <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/50" />
                <div className="absolute -bottom-2 -left-6 w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/50" />
              </div>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              System identifying <span className="text-cyan-400">Low Operational Cost</span> as the primary causal factor for <span className="text-emerald-400">High ROI</span> ventures.
            </p>
          </div>
          <button className="mt-6 w-full py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs transition-all">
            Expand Intelligence Map
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; icon: React.ReactNode; trend?: string }> = ({ label, value, icon, trend }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-2"
  >
    <div className="flex justify-between items-start">
      <span className="text-white/40 text-xs font-medium uppercase tracking-wider">{label}</span>
      {icon}
    </div>
    <div className="text-2xl font-bold">{value}</div>
    {trend && <div className="text-[10px] text-emerald-400 font-mono">{trend}</div>}
  </motion.div>
);

const OpportunityItem: React.FC<{ title: string; desc: string; tag: string; score: number, onClick?: () => void }> = ({ title, desc, tag, score, onClick }) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    onClick={onClick}
    className="group p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all cursor-pointer"
  >
    <div className="flex justify-between items-start mb-2">
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 bg-white/10 rounded-md text-[10px] font-mono text-white/60 uppercase">{tag}</span>
        <h4 className="font-semibold text-sm group-hover:text-emerald-400 transition-colors">{title}</h4>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-emerald-400 font-mono text-xs">{score}% Match</span>
        <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[8px] font-bold text-emerald-500 uppercase opacity-0 group-hover:opacity-100 transition-opacity">View v3 Report</div>
      </div>
    </div>
    <p className="text-xs text-white/40 line-clamp-1">{desc}</p>
  </motion.div>
);
