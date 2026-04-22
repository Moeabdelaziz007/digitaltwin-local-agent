'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Zap, Shield, TrendingUp, Cpu, Globe, PieChart, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeartbeatStats {
  timestamp: string;
  global: {
    totalVentures: number;
    activeVentures: number;
    totalSpent: number;
    totalTokens: number;
    heartbeatStatus: string;
  };
  ventures: Array<{
    id: string;
    name: string;
    status: string;
    health: number;
    budget: any;
    recentActivity: any[];
  }>;
}

export default function HeartbeatDashboard() {
  const [stats, setStats] = useState<HeartbeatStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/heartbeat/stats');
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error('Failed to load heartbeat stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Live updates every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#0a0a0b] text-white">
      <div className="animate-pulse flex flex-col items-center">
        <Activity className="w-12 h-12 text-blue-500 mb-4 animate-bounce" />
        <p className="text-sm font-mono tracking-widest uppercase">Initializing Synapse...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#e4e4e7] p-8 font-sans selection:bg-blue-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full"></div>
      </div>

      <header className="relative z-10 flex justify-between items-end mb-12 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
            AHP Heartbeat <span className="text-blue-500">Terminal</span>
          </h1>
          <p className="text-gray-500 mt-2 font-mono text-sm uppercase tracking-widest">Autonomous Venture Holding Protocol</p>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="flex items-center gap-2 justify-end">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-sm font-mono text-green-500">SYSTEM LIVE</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{new Date(stats?.timestamp || '').toLocaleTimeString()}</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {/* Global KPI Cards */}
        <StatCard 
          icon={<Globe className="w-5 h-5" />} 
          label="Active Ventures" 
          value={stats?.global.activeVentures || 0} 
          trend="+2 New"
          color="blue"
        />
        <StatCard 
          icon={<Zap className="w-5 h-5" />} 
          label="Token Throughput" 
          value={(stats?.global.totalTokens || 0).toLocaleString()} 
          trend="840/sec"
          color="purple"
        />
        <StatCard 
          icon={<TrendingUp className="w-5 h-5" />} 
          label="Operational Spend" 
          value={`$${stats?.global.totalSpent.toFixed(2)}`} 
          trend="Within Limit"
          color="green"
        />
        <StatCard 
          icon={<Shield className="w-5 h-5" />} 
          label="Governance Pulse" 
          value={stats?.global.heartbeatStatus.toUpperCase() || ''} 
          trend="Locked"
          color="orange"
        />
      </main>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Venture List */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-500" /> Active Infrastructure
            </h2>
            <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest font-mono">Expand All</button>
          </div>
          
          <AnimatePresence mode="popLayout">
            {stats?.ventures.map((v) => (
              <motion.div 
                key={v.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.08] transition-all hover:border-blue-500/30"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-medium group-hover:text-blue-400 transition-colors">{v.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-mono text-gray-500">{v.id}</span>
                      <span className="h-1 w-1 bg-gray-700 rounded-full"></span>
                      <span className="text-xs font-medium text-green-500/80 uppercase tracking-tighter">Running</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-mono font-bold">{v.health}%</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono mt-1">System Health</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-8 mb-6">
                  <VentureMetric label="Monthly Budget" value={`$${v.budget.spent_this_month_usd.toFixed(2)} / $${v.budget.monthly_limit_usd}`} percent={(v.budget.spent_this_month_usd / v.budget.monthly_limit_usd) * 100} />
                  <VentureMetric label="Daily Rate" value={`$${v.budget.spent_today_usd.toFixed(2)} / $${v.budget.daily_limit_usd}`} percent={(v.budget.spent_today_usd / v.budget.daily_limit_usd) * 100} />
                  <VentureMetric label="Compute Units" value={`${(v.budget.spent_tokens / 1000).toFixed(1)}k / ${(v.budget.token_limit / 1000).toFixed(0)}k`} percent={(v.budget.spent_tokens / v.budget.token_limit) * 100} />
                </div>

                {v.recentActivity.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono mb-3">Live Feed</p>
                    <div className="space-y-2">
                      {v.recentActivity.map((log, i) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <span className="text-blue-500/50 font-mono text-[10px] mt-1">[{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
                          <span className="text-gray-400 line-clamp-1">{log.content}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </section>

        {/* Sidebar Logs & Events */}
        <section className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-full">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
              <PieChart className="w-5 h-5 text-purple-500" /> Neural Activity
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                <p className="text-xs text-blue-400 font-mono mb-1">SYNAPSE_ROUTER</p>
                <p className="text-sm text-gray-300">Successfully mapped task 'Generate SEO' to <b>Content Multiplier</b></p>
              </div>
              <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-xl">
                <p className="text-xs text-green-400 font-mono mb-1">GOVERNANCE_LOCKED</p>
                <p className="text-sm text-gray-300">Ticket <b>#T-942</b> approved by CFO. Releasing funds.</p>
              </div>
              <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                <p className="text-xs text-purple-400 font-mono mb-1">HEARTBEAT_PULSE</p>
                <p className="text-sm text-gray-300">Global audit completed. All systems reporting nominal.</p>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-xs text-gray-500 uppercase tracking-widest font-mono mb-4">Workforce Performance</h3>
              <div className="space-y-4">
                <PerformanceRow label="Orchestrator" score={98} />
                <PerformanceRow label="Executor" score={94} />
                <PerformanceRow label="Critic" score={100} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, color }: any) {
  const colors: any = {
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    green: 'text-green-500 bg-green-500/10 border-green-500/20',
    orange: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.08] transition-all">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-gray-500 text-sm font-medium">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <h3 className="text-2xl font-bold">{value}</h3>
        <span className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">{trend}</span>
      </div>
    </div>
  );
}

function VentureMetric({ label, value, percent }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] uppercase tracking-widest font-mono text-gray-500">
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium">{value}</div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percent, 100)}%` }}
          className={`h-full ${percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-orange-500' : 'bg-blue-500'}`}
        />
      </div>
    </div>
  );
}

function PerformanceRow({ label, score }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400">{label}</span>
      <div className="flex items-center gap-3">
        <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500/50" style={{ width: `${score}%` }}></div>
        </div>
        <span className="text-xs font-mono w-8 text-right">{score}%</span>
      </div>
    </div>
  );
}
