/**
 * /src/components/dashboard/VentureLabView.tsx
 * Premium Visualization for MAS-ZERO Venture Lab v3.
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ShieldAlert, Cpu, Layers, CheckCircle, Zap, TrendingUp } from 'lucide-react';
import { ConsensusVerdict } from '@/types/twin';
import { CausalGraph } from './CausalGraph';

interface VentureLabViewProps {
  verdict: ConsensusVerdict;
  onClose: () => void;
}

export const VentureLabView: React.FC<VentureLabViewProps> = ({ verdict, onClose }) => {
  const fragilityMap = verdict.fragility_map || {};
  const failureModes = Object.entries(fragilityMap);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
    >
      <div className="w-full max-w-5xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-emerald-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <Zap className="text-emerald-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">Venture Blueprint: v0.01</h2>
              <p className="text-xs text-white/40 font-mono">MAS-ZERO Dialectic Synthesis Complete</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs transition-all text-white/60"
          >
            Close View
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-12">
          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Fragility Map (Failure Casino Results) */}
            <div className="lg:col-span-1 space-y-6">
              <h3 className="text-sm font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle size={14} className="text-yellow-500" />
                Fragility Map
              </h3>
              <div className="space-y-4">
                {failureModes.length > 0 ? failureModes.map(([mode, prob]) => (
                  <div key={mode} className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-white/60 truncate mr-2">{mode}</span>
                      <span className={prob > 70 ? 'text-red-400' : prob > 40 ? 'text-yellow-400' : 'text-emerald-400'}>
                        {prob}% Risk
                      </span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${prob}%` }}
                        className={`h-full ${prob > 70 ? 'bg-red-500' : prob > 40 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                      />
                    </div>
                  </div>
                )) : (
                  <div className="py-8 text-center border border-dashed border-white/10 rounded-2xl">
                    <p className="text-xs text-white/20 italic">No fragility data available</p>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                <div className="flex gap-3">
                  <ShieldAlert className="text-red-400 shrink-0" size={18} />
                  <p className="text-[10px] text-red-200/60 leading-relaxed">
                    Critical vulnerability detected in <span className="text-red-400">Market Saturation</span> scenarios. Recommended mitigation: Hyper-local niche focus.
                  </p>
                </div>
              </div>
            </div>

            {/* Architecture Tournament */}
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-sm font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Cpu size={14} className="text-cyan-500" />
                Architecture Tournament
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500 text-[8px] font-bold text-black uppercase rounded">Winner</div>
                  <div className="flex items-center gap-3 mb-4">
                    <Layers className="text-emerald-400" size={20} />
                    <h4 className="text-sm font-bold text-white">Local-First Agentic Stack</h4>
                  </div>
                  <ul className="space-y-2">
                    {['Zero operational cost', 'High data sovereignty', 'Minimal latency'].map(trait => (
                      <li key={trait} className="flex items-center gap-2 text-[10px] text-white/60">
                        <CheckCircle size={10} className="text-emerald-500" />
                        {trait}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl opacity-60">
                  <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="text-white/40" size={20} />
                    <h4 className="text-sm font-bold text-white/60">Serverless SaaS Stack</h4>
                  </div>
                  <p className="text-[10px] text-white/40 italic">Rejected: High platform dependency and vendor lock-in risk.</p>
                </div>
              </div>

              {/* Causal Intelligence Section */}
              <div className="mt-8 space-y-4">
                <h4 className="text-[10px] font-mono text-white/30 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={12} className="text-cyan-400" />
                  Reasoning Chain (Causal Graph)
                </h4>
                <CausalGraph 
                  graph={(verdict.scout?.metadata?.causal_graph as any) || {
                    nodes: [
                      { id: '1', label: 'Market Disruption', node_type: 'event' },
                      { id: '2', label: 'Agentic Solve', node_type: 'decision' },
                      { id: '3', label: 'Revenue', node_type: 'profit' }
                    ],
                    edges: [
                      { source: '1', target: '2', relation_type: 'causes', weight: 1.0 },
                      { source: '2', target: '3', relation_type: 'amplifies', weight: 0.8 }
                    ]
                  }} 
                  className="h-48 border-white/5 bg-white/5" 
                />
              </div>

              {/* Build Trace / Execution Path */}
              <div className="space-y-3 pt-4">
                <h4 className="text-[10px] font-mono text-white/30 uppercase">Self-Play Build Trace</h4>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {Array.isArray(verdict.ceo?.metadata?.build_trace) ? verdict.ceo?.metadata?.build_trace.map((step: string, i: number) => (
                    <div key={i} className="shrink-0 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-mono text-white/60">
                      Step {i+1}: {step}
                    </div>
                  )) : ['Initialize', 'Sense Market', 'Draft MVP', 'Verify Stack'].map((step, i) => (
                    <div key={i} className="shrink-0 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-mono text-white/40">
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Final Synthesis Blueprint */}
          <div className="space-y-6">
            <h3 className="text-sm font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-500" />
              Final Synthesis
            </h3>
            <div className="p-8 bg-white/5 border border-white/10 rounded-3xl prose prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-sm text-white/80 leading-relaxed font-sans">
                {verdict.final_answer}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-black/40 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-white/20">
          <span>DigitalTwin :: MAS-ZERO-ENGINE-V0.01</span>
          <span>Security Level: Sovereign Local</span>
        </div>
      </div>
    </motion.div>
  );
};
