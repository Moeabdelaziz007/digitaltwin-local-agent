import PocketBase from 'pocketbase';
import { env } from '@/lib/env';
import Link from 'next/link';
import { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Trace Detail | Observability',
};

interface TraceSpan {
  id: string;
  trace_id: string;
  span_id: string;
  parent_span_id: string;
  name: string;
  start_time: string;
  end_time: string;
  duration_ms: number;
  status: string;
  attributes_json: Record<string, unknown>;
  request_type?: string;
  component: string;
}

async function getTraceDetails(traceId: string) {
  const pb = new PocketBase(env.POCKETBASE_URL);
  pb.autoCancellation(false);
  
  try {
    const result = await pb.collection('traces').getFullList<TraceSpan>({
      filter: `trace_id = "${traceId}"`,
      sort: 'start_time',
    });
    return result;
  } catch (error) {
    console.error('[ADMIN_OBS_DETAIL] Fetch failed:', error);
    return [];
  }
}

export default async function TraceDetail({ params }: { params: Promise<{ traceId: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { traceId } = await params;
  const spans = await getTraceDetails(traceId);

  if (spans.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Trace Not Found</h1>
          <Link href="/admin/observability" className="text-blue-400 hover:underline">Back to List</Link>
        </div>
      </div>
    );
  }

  const rootSpan = spans.find(s => !s.parent_span_id) || spans[0];
  const totalDuration = rootSpan.duration_ms;
  const startTimeMs = new Date(rootSpan.start_time).getTime();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <Link href="/admin/observability" className="text-neutral-500 hover:text-neutral-300 text-sm mb-4 inline-block">← Back to traces</Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Trace Details</h1>
              <p className="text-neutral-400 font-mono text-sm">{traceId}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-400">{Math.round(totalDuration)}ms</div>
              <p className="text-neutral-500 text-sm">Total Execution Time</p>
            </div>
          </div>
        </header>

        {/* Summary Details */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <MetaItem label="Component" value={rootSpan.component} />
          <MetaItem label="Request Type" value={rootSpan.request_type || 'N/A'} />
          <MetaItem label="Spans" value={spans.length.toString()} />
          <MetaItem label="Session" value={typeof rootSpan.attributes_json?.['session_id'] === 'string' ? (rootSpan.attributes_json['session_id'] as string).slice(0, 8) : 'N/A'} />
        </div>

        {/* Waterfall View */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/50">
             <h2 className="font-semibold">Span Waterfall</h2>
          </div>
          
          <div className="p-6 overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Timeline Header */}
              <div className="flex mb-4 border-b border-neutral-800 pb-2 text-[10px] text-neutral-600 uppercase font-bold">
                 <div className="w-1/4">Operations</div>
                 <div className="w-3/4 relative h-4">
                    <div className="absolute left-0 top-0">0ms</div>
                    <div className="absolute left-1/4 top-0">{Math.round(totalDuration * 0.25)}ms</div>
                    <div className="absolute left-1/2 top-0">{Math.round(totalDuration * 0.5)}ms</div>
                    <div className="absolute left-3/4 top-0">{Math.round(totalDuration * 0.75)}ms</div>
                    <div className="absolute right-0 top-0">{Math.round(totalDuration)}ms</div>
                 </div>
              </div>

              {/* Spans */}
              <div className="space-y-1">
                {spans.map((span) => {
                  const spanStart = new Date(span.start_time).getTime();
                  const offsetPct = ((spanStart - startTimeMs) / totalDuration) * 100;
                  const widthPct = (span.duration_ms / totalDuration) * 100;
                  const depth = calculateDepth(span, spans);

                  return (
                    <div key={span.id} className="group">
                      <div className="flex items-center py-2 hover:bg-white/[0.03] rounded px-2 transition-colors">
                        <div className="w-1/4 pr-4">
                           <div className="flex items-center gap-2">
                             <div style={{ marginLeft: `${depth * 12}px` }} className="flex-shrink-0" />
                             <span className={`text-xs font-medium truncate ${span.status === '2' ? 'text-red-400' : 'text-neutral-200'}`}>
                               {span.name}
                             </span>
                           </div>
                           <div style={{ marginLeft: `${depth * 12}px` }} className="text-[10px] text-neutral-500 uppercase flex gap-2">
                              <span>{span.component}</span>
                              {typeof (span.attributes_json as any)?.['llm.model_name'] === 'string' && <span>• {(span.attributes_json as any)['llm.model_name']}</span>}
                           </div>
                        </div>
                        <div className="w-3/4 relative h-6 rounded bg-neutral-800/30">
                           <div 
                              className={`absolute h-full rounded cursor-help ${getSpanColor(span)}`}
                              style={{ 
                                left: `${Math.max(0, offsetPct)}%`, 
                                width: `${Math.max(0.5, widthPct)}%` 
                              }}
                              title={`${span.name}: ${Math.round(span.duration_ms)}ms`}
                           >
                              {span.duration_ms > totalDuration * 0.1 && (
                                <span className="text-[9px] text-black/60 font-bold ml-1 truncate block">
                                  {Math.round(span.duration_ms)}ms
                                </span>
                              )}
                           </div>
                        </div>
                      </div>
                      
                      {/* Sub-details (attributes) - Safe Inspection */}
                      <div className="hidden group-hover:block ml-[25%] p-4 bg-neutral-900 border border-neutral-800 rounded-lg my-2 shadow-xl">
                        <h4 className="text-[10px] uppercase font-bold text-neutral-500 mb-2">Attributes</h4>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 font-mono text-[11px]">
                           {Object.entries(span.attributes_json || {}).map(([k, v]) => (
                             <div key={k} className="flex justify-between border-b border-neutral-800/50 py-1">
                               <span className="text-neutral-400 pr-4">{k}</span>
                               <span className="text-blue-300 truncate max-w-[200px]">{JSON.stringify(v)}</span>
                             </div>
                           ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
      <p className="text-neutral-500 text-[10px] uppercase font-bold mb-1">{label}</p>
      <p className="text-neutral-100 font-medium">{value}</p>
    </div>
  );
}

function calculateDepth(span: TraceSpan, allSpans: TraceSpan[]): number {
  let depth = 0;
  let current = span;
  while (current.parent_span_id) {
    const parent = allSpans.find(s => s.span_id === current.parent_span_id);
    if (!parent) break;
    depth++;
    current = parent;
  }
  return depth;
}

function getSpanColor(span: TraceSpan): string {
  if (span.status === '2') return 'bg-red-500';
  if (span.name.includes('ollama')) return 'bg-purple-400';
  if (span.name.includes('memory')) return 'bg-amber-400';
  if (span.name.includes('reflect')) return 'bg-indigo-400';
  return 'bg-blue-400';
}
