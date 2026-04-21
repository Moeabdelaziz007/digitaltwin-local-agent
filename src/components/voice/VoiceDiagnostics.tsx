'use client';

import React from 'react';
import { useVoice } from './VoiceProvider';
import { Activity, Zap, ShieldCheck, AlertTriangle } from 'lucide-react';

export function VoiceDiagnostics() {
  const { state, metrics } = useVoice();

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 glass border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan flex items-center gap-2">
          <Activity size={12} className="animate-pulse" />
          Neural Voice Telemetry
        </h3>
        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
          state === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-cyan/10 border-cyan/20 text-cyan'
        }`}>
          {state}
        </span>
      </div>

      <div className="space-y-4">
        <MetricRow 
          label="STT Hub Latency" 
          value={metrics.timeToFirstTranscript ? `${metrics.timeToFirstTranscript}ms` : '--'} 
          icon={<Zap size={10} />}
        />
        <MetricRow 
          label="TTFT (First Token)" 
          value={metrics.timeToFirstToken ? `${metrics.timeToFirstToken}ms` : '--'} 
          icon={<ShieldCheck size={10} />}
        />
        <MetricRow 
          label="Conf. Rating" 
          value={metrics.sttConfidence ? `${(metrics.sttConfidence * 100).toFixed(1)}%` : '--'} 
          icon={<AlertTriangle size={10} />}
        />
      </div>

      <div className="mt-6 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${state === 'idle' ? 'bg-neutral-500' : 'bg-green-500 animate-pulse'}`} />
          <span className="text-[9px] uppercase tracking-widest text-text-muted">Interruption Awareness: ACTIVE</span>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-text-muted">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-[10px] font-mono font-bold text-white">{value}</span>
    </div>
  );
}
