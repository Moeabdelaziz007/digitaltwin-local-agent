/**
 * /src/components/dashboard/ProfitDashboard.tsx
 * Premium Dashboard for the Autonomous Venture Lab.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Target, Cpu, Activity, Zap, DollarSign } from 'lucide-react';
import { VentureLabView } from './VentureLabView';
import { CausalGraph } from './CausalGraph';
import { ConsensusVerdict, Opportunity } from '@/types/twin';

interface ProfitState {
  simulatedProfit: number;
  activeOpportunities: number;
  successRate: number;
  systemHealth: number;
  globalInsights?: Opportunity['causal_graph'];
}

interface VentureOpportunity {
  title: string;
  desc: string;
  tag: string;
  score: number;
  data: any;
}

export const ProfitDashboard: React.FC = () => {
  const [state, setState] = useState<ProfitState>({
    simulatedProfit: 0,
    activeOpportunities: 0,
    successRate: 0,
    systemHealth: 100,
    globalInsights: {
      nodes: [
        { id: 'g1', label: 'Low Ops Cost', node_type: 'event' },
        { id: 'g2', label: 'Local Execution', node_type: 'decision' },
        { id: 'g3', label: 'Max Profit', node_type: 'profit' }
      ],
      edges: [
        { source: 'g1', target: 'g2', relation_type: 'causes', weight: 1.0 },
        { source: 'g2', target: 'g3', relation_type: 'amplifies', weight: 0.9 }
      ]
    }
  });

  const [opportunities, setOpportunities] = useState<VentureOpportunity[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    // Initial simulation trigger
    const runInitialSimulation = async () => {
      setIsSimulating(true);
      try {
        const { arbitrageAgent } = await import('@/lib/agents/profit-lab/arbitrage-agent');
        const res = await arbitrageAgent.simulateArbitrage('ETH/USDC');
        
        setState(prev => ({
          ...prev,
          simulatedProfit: res.math.netProfit,
          activeOpportunities: 1,
          successRate: Math.round(res.math.probability * 100)
        }));

        setOpportunities([{
          title: "L2 Cross-Chain Arbitrage (ETH/USDC)",
          desc: res.strategy,
          tag: "Crypto",
          score: Math.round(res.math.probability * 100),
          data: res
        }]);
      } catch (e) {
        console.error("Simulation failed", e);
      } finally {
        setIsSimulating(false);
      }
    };

    void runInitialSimulation();
  }, []);

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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 100 100" className="text-cyan-400">
              <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="none" stroke="currentColor" strokeWidth="8" />
            </svg>
            <span className="font-display font-bold text-xs tracking-tighter uppercase">Digital Twin v0.01</span>
          </div>
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
            <span className="text-[9px] font-display text-amber-500 uppercase font-bold tracking-widest">⚠️ Pre-Alpha / Prototype</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/10 rounded-full">
            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-display text-cyan-400 uppercase font-bold tracking-widest">Online</span>
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
            <Zap size={18} className={`text-yellow-400 ${isSimulating ? 'animate-pulse' : ''}`} />
            Live Opportunity Stream
            {isSimulating && <span className="text-[10px] text-cyan-400 font-mono animate-pulse">Scanning...</span>}
          </h3>
          <div className="space-y-3">
            {opportunities.length > 0 ? opportunities.map((opp, idx) => (
              <OpportunityItem 
                key={idx}
                title={opp.title} 
                desc={opp.desc}
                tag={opp.tag}
                score={opp.score}
                onClick={openMockReport}
              />
            )) : (
              <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center opacity-40">
                <p className="text-xs font-mono">No active signals in current regime</p>
              </div>
            )}
            
            {/* Roadmap Items marked clearly */}
            <div className="mt-8 pt-4 border-t border-white/5 opacity-50">
              <h4 className="text-[10px] font-display text-white/30 uppercase tracking-[0.2em] mb-3">System Roadmap / Aspirational</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl grayscale">
                   <p className="text-[10px] font-bold text-white/40">GitHub Bounty Hunter</p>
                   <p className="text-[8px] text-white/20 mt-1">Status: Concept Phase</p>
                </div>
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl grayscale">
                   <p className="text-[10px] font-bold text-white/40">Upwork/Contra Agent</p>
                   <p className="text-[8px] text-white/20 mt-1">Status: Research phase</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Causal Graph Preview */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-mono text-white/40 uppercase mb-4">Causal Intelligence Map</h3>
            <CausalGraph graph={state.globalInsights} className="h-48 border-none bg-transparent p-0" />
            <p className="text-[10px] text-white/60 leading-relaxed mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
              Agent identified <span className="text-cyan-400 font-bold">Zero Operational Overhead</span> as the core causal catalyst for the current <span className="text-emerald-400 font-bold">Alpha Regime</span>.
            </p>
          </div>
          <button className="mt-auto w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all">
            Enter Reasoning Deep-Dive
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
