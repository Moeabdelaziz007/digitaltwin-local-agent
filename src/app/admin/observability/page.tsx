import PocketBase from 'pocketbase';
import { env } from '@/lib/env';
import Link from 'next/link';
import { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Observability | Admin Dashboard',
  description: 'Monitor agent execution, latency, and failures.',
};

async function getTraceSummaries(filterType?: string) {
  const pb = new PocketBase(env.POCKETBASE_URL);
  pb.autoCancellation(false);
  
  let filter = 'parent_span_id = ""';
  if (filterType === 'failed') filter += ' && status != "1"';
  if (filterType === 'slow') filter += ' && duration_ms > 1000';

  try {
    const result = await pb.collection('traces').getList(1, 50, {
      filter: filter,
      sort: '-start_time',
    });
    return result.items;
  } catch (error) {
    console.error('[ADMIN_OBS] Fetch failed:', error);
    return [];
  }
}

export default async function ObservabilityAdmin({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  // PHASE 4 FIX: Strict Admin Guard
  const isAdmin = userId === env.ADMIN_USER_ID;
  if (!isAdmin) redirect('/');

  // Basic admin check (could use publicMetadata in production)
  // For now we allow authenticated users to see trial observability
  
  const { filter: filterType } = await searchParams;
  const traces = await getTraceSummaries(filterType);

  // Dynamic Stats Calculation
  const totalTraces = traces.length;
  const failedTraces = traces.filter(t => t.status !== '1').length;
  const failureRate = totalTraces > 0 ? (failedTraces / totalTraces) * 100 : 0;
  const maxLatency = totalTraces > 0 ? Math.max(...traces.map(t => t.duration_ms)) : 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Observability</h1>
            <p className="text-neutral-400">Production-grade agent tracing & performance monitoring.</p>
          </div>
          <div className="flex gap-4">
            <Link 
              href="/admin/observability" 
              className={`px-4 py-2 rounded-lg text-sm transition-colors border ${!filterType ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'}`}
            >
              All
            </Link>
            <Link 
              href="/admin/observability?filter=failed" 
              className={`px-4 py-2 rounded-lg text-sm transition-colors border ${filterType === 'failed' ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'}`}
            >
              Failed
            </Link>
            <Link 
              href="/admin/observability?filter=slow" 
              className={`px-4 py-2 rounded-lg text-sm transition-colors border ${filterType === 'slow' ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'}`}
            >
              Slow
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard title="Total Traces" value={totalTraces.toString()} unit="Root Spans" color="text-blue-400" />
          <StatCard title="Max Latency" value={Math.round(maxLatency).toString() + 'ms'} unit="Peak" color="text-amber-400" />
          <StatCard title="Failure Rate" value={failureRate.toFixed(1) + '%'} unit="Error" color="text-red-400" />
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/50 flex justify-between items-center">
            <h2 className="font-semibold text-lg">Recent Traces</h2>
            <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">Refresh</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-neutral-500 text-sm uppercase tracking-wider border-b border-neutral-800">
                  <th className="px-6 py-4 font-semibold">Trace ID</th>
                  <th className="px-6 py-4 font-semibold">Request Type</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Duration</th>
                  <th className="px-6 py-4 font-semibold">Timestamp</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {traces.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 italic">
                      No traces found yet. Start a conversation to see data.
                    </td>
                  </tr>
                ) : (
                  traces.map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs text-neutral-400">
                        {t.trace_id.slice(0, 8)}...{t.trace_id.slice(-4)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-neutral-100">{t.name}</span>
                          <span className="text-xs text-neutral-500">{t.request_type || 'unspecified'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-6 py-4 text-neutral-300 font-mono text-sm">
                        {Math.round(t.duration_ms)}ms
                      </td>
                      <td className="px-6 py-4 text-neutral-500 text-sm">
                        {new Date(t.start_time).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/admin/observability/${t.trace_id}`}
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Details →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, unit, color }: { title: string, value: string, unit: string, color: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl">
      <p className="text-neutral-500 text-sm mb-1 uppercase font-semibold">{title}</p>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${color}`}>{value}</span>
        <span className="text-neutral-600 text-sm">{unit}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isOk = status === '1';
  return (
    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight ${
      isOk ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
    }`}>
      {isOk ? 'OK' : 'Error'}
    </span>
  );
}
