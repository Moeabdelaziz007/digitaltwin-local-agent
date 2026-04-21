"use client";

import { useEffect, useState } from 'react';
import { GuardianReport, GuardianIssue } from '@/lib/guardian/observability-guardian';
import { ShieldAlert, ShieldCheck, Activity, Clock, AlertTriangle, Bug } from 'lucide-react';
import Link from 'next/link';

export default function GuardianDashboard() {
  const [report, setReport] = useState<GuardianReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/guardian/scan');
      const data = await res.json();
      if (data.success) {
        setReport(data.report);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReport();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex justify-between items-center bg-neutral-900/40 p-6 rounded-3xl border border-neutral-800 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-blue-500/10 rounded-lg">
                 <ShieldCheck className="text-blue-400 w-6 h-6" />
               </div>
               <h1 className="text-3xl font-bold tracking-tight text-white italic">Neural Guardian</h1>
            </div>
            <p className="text-neutral-500 text-sm">Autonomous system watcher and health auditing console.</p>
          </div>
          <button 
            onClick={fetchReport}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-full transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20 active:scale-95"
          >
            {loading ? 'Scanning...' : 'Trigger Full Audit'}
          </button>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
             <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
             <p className="text-neutral-500 font-mono italic">Calibrating sensors & scanning traces...</p>
          </div>
        ) : report ? (
          <>
            {/* High-Level Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
               <StatCard 
                 icon={<Activity className="text-emerald-400" />} 
                 label="Neural Status" 
                 value={report.status} 
                 color={report.status === 'HEALTHY' ? 'text-emerald-400' : 'text-amber-400'}
               />
               <StatCard 
                 icon={<Bug className="text-red-400" />} 
                 label="24h Error Rate" 
                 value={`${report.system_stats.error_rate}%`} 
                 color="text-red-400"
               />
               <StatCard 
                 icon={<Clock className="text-amber-400" />} 
                 label="Avg Response" 
                 value={`${Math.round(report.system_stats.avg_latency_ms)}ms`} 
                 color="text-amber-400"
               />
            </div>

            {/* Issues List */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                <div className="px-8 py-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/80">
                   <h2 className="text-lg font-bold flex items-center gap-2">
                     <AlertTriangle className="w-5 h-5 text-amber-500" />
                     Live Anomalies & Issues
                   </h2>
                   <span className="text-xs bg-neutral-800 px-3 py-1 rounded-full text-neutral-400">Showing last 24h</span>
                </div>

                <div className="divide-y divide-neutral-800">
                   {report.issues.length === 0 ? (
                     <div className="p-20 text-center">
                        <ShieldCheck className="w-16 h-16 text-emerald-500/20 mx-auto mb-4" />
                        <p className="text-neutral-500 italic">Guardian found no critical anomalies. Systems nominal.</p>
                     </div>
                   ) : (
                     report.issues.map((issue) => (
                       <IssueRow key={issue.id} issue={issue} />
                     ))
                   )}
                </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20">
             <p className="text-red-400">Failed to load Guardian report. Ensure you are an Admin.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl group hover:border-blue-500/40 transition-all">
       <div className="flex items-center gap-3 mb-4">
         {icon}
         <span className="text-neutral-500 text-sm font-bold uppercase tracking-widest">{label}</span>
       </div>
       <div className={`text-4xl font-black ${color} tracking-tighter`}>{value}</div>
    </div>
  );
}

function IssueRow({ issue }: { issue: GuardianIssue }) {
  const typeColors = {
    ERROR: 'text-red-500 bg-red-500/10',
    WARNING: 'text-amber-500 bg-amber-500/10',
    LATENCY: 'text-purple-500 bg-purple-500/10',
    SECURITY: 'text-red-600 bg-red-600/10',
  };

  return (
    <div className="px-8 py-6 hover:bg-white/[0.02] transition-colors group">
      <div className="flex justify-between items-start">
        <div className="flex gap-4">
           <div className={`p-2 rounded-xl h-fit border border-current/20 ${typeColors[issue.type]}`}>
             {issue.type === 'ERROR' ? <ShieldAlert className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
           </div>
           <div>
             <div className="flex items-center gap-2 mb-1">
               <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${typeColors[issue.type]}`}>
                 {issue.type}
               </span>
               <span className="text-neutral-600 text-[10px] font-mono">{new Date(issue.timestamp).toLocaleTimeString()}</span>
             </div>
             <h3 className="text-white font-medium mb-1">{issue.message}</h3>
             <p className="text-neutral-500 text-xs italic">Source: {issue.source}</p>
           </div>
        </div>
        {issue.trace_id && (
          <Link 
            href={`/admin/observability/${issue.trace_id}`}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400 text-xs font-bold hover:underline"
          >
            Inspect Trace →
          </Link>
        )}
      </div>
    </div>
  );
}
