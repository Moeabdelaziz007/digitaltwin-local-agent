import { getServerPB } from '@/lib/pb-server';

export interface GuardianIssue {
  id: string;
  type: 'ERROR' | 'WARNING' | 'LATENCY' | 'SECURITY';
  message: string;
  source: string;
  timestamp: string;
  trace_id?: string;
  metadata?: Record<string, unknown>;
}

export interface GuardianReport {
  timestamp: string;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  system_stats: {
    total_traces_24h: number;
    error_rate: number;
    avg_latency_ms: number;
  };
  issues: GuardianIssue[];
}

export class ObservabilityGuardian {
  private pb = getServerPB();

  /**
   * Performs a comprehensive scan of the observability data to find real issues.
   */
  public async performFullScan(): Promise<GuardianReport> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // 1. Fetch recent traces
    const traces = await this.pb.collection('traces').getFullList({
      filter: `start_time >= "${yesterday}"`,
      sort: '-start_time',
    });

    const issues: GuardianIssue[] = [];
    let totalLatency = 0;
    let errorCount = 0;

    for (const trace of traces) {
      totalLatency += trace.duration_ms;
      
      // Detection: Failure
      if (trace.status !== '1') {
        errorCount++;
        issues.push({
          id: `err-${trace.id}`,
          type: 'ERROR',
          message: `Trace execution failed with status ${trace.status}`,
          source: trace.name,
          timestamp: trace.start_time,
          trace_id: trace.trace_id,
        });
      }

      // Detection: High Latency (> 3s for root spans)
      if (!trace.parent_span_id && trace.duration_ms > 3000) {
        issues.push({
          id: `lat-${trace.id}`,
          type: 'LATENCY',
          message: `High latency detected: ${Math.round(trace.duration_ms)}ms`,
          source: trace.name,
          timestamp: trace.start_time,
          trace_id: trace.trace_id,
        });
      }
      
      // Detection: Missing request type
      if (!trace.request_type && !trace.parent_span_id) {
        issues.push({
          id: `warn-req-${trace.id}`,
          type: 'WARNING',
          message: 'Root span missing request_type metadata',
          source: trace.name,
          timestamp: trace.start_time,
          trace_id: trace.trace_id,
        });
      }
    }

    const avgLatency = traces.length > 0 ? totalLatency / traces.length : 0;
    const errorRate = traces.length > 0 ? (errorCount / traces.length) * 100 : 0;

    let status: GuardianReport['status'] = 'HEALTHY';
    if (errorRate > 10 || issues.some(i => i.type === 'ERROR')) status = 'DEGRADED';
    if (errorRate > 50) status = 'CRITICAL';

    return {
      timestamp: new Date().toISOString(),
      status,
      system_stats: {
        total_traces_24h: traces.length,
        error_rate: Number(errorRate.toFixed(2)),
        avg_latency_ms: Number(avgLatency.toFixed(2)),
      },
      issues: issues.slice(0, 20), // Top 20 issues
    };
  }
}

export const guardian = new ObservabilityGuardian();
