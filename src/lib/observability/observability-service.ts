import { 
  trace, 
  Span, 
  SpanStatusCode, 
  SpanKind,
  Attributes
} from '@opentelemetry/api';
import { init, registerOtelFlush } from 'braintrust';
import { env } from '@/lib/env';

// We isolate Node-only types and imports to prevent client-side bundling errors
type NodeSDKType = import('@opentelemetry/sdk-node').NodeSDK;

/**
 * ObservabilityService
 * Central management for tracing and telemetry.
 */
export class ObservabilityService {
  private static instance: ObservabilityService;
  private sdk: any | null = null;
  private tracerName: string = 'digital-twin-core';
  private isServer: boolean = typeof window === 'undefined';

  private constructor() {
    // Hidden initialization
  }

  public static getInstance(): ObservabilityService {
    if (!ObservabilityService.instance) {
      ObservabilityService.instance = new ObservabilityService();
    }
    return ObservabilityService.instance;
  }

  /**
   * Initialize the OTel SDK
   */
  public async init() {
    if (!this.isServer || this.sdk) return;

    try {
      // Initialize Braintrust
      if (process.env.BRAINTRUST_API_KEY && process.env.BRAINTRUST_PROJECT_ID) {
        init({
          apiKey: process.env.BRAINTRUST_API_KEY,
          projectName: process.env.BRAINTRUST_PROJECT_ID,
        });
        console.log('[BRAINTRUST] Initialized');
      }

      // Dynamic imports to prevent Webpack from trying to bundle Node-only modules for the browser
      const { NodeSDK } = await import('@opentelemetry/sdk-node');
      const { BatchSpanProcessor } = await import('@opentelemetry/sdk-trace-base');
      const resources = await import('@opentelemetry/resources');
      const { SemanticResourceAttributes } = await import('@opentelemetry/semantic-conventions');
      const { PocketBaseSpanExporter } = await import('./pb-exporter');

      const exporter = new PocketBaseSpanExporter(env.POCKETBASE_URL);
      
      this.sdk = new NodeSDK({
        resource: new resources.Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: 'digital-twin-app',
          [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
        }),
        spanProcessor: new BatchSpanProcessor(exporter),
        instrumentations: [],
      });

      this.sdk.start();
      
      // Register OTel flush with Braintrust to ensure traces are sent
      if (process.env.BRAINTRUST_API_KEY) {
        registerOtelFlush(this.sdk);
        console.log('[BRAINTRUST] OTel flush registered');
      }
      
      console.log('[OBSERVABILITY] OTel SDK Started with PocketBase Exporter + Braintrust Drain (Server-side)');
    } catch (e) {
      console.error('[OBSERVABILITY] Failed to initialize OTel SDK:', e);
    }
  }

  /**
   * Run a function within a span
   */
  public async trace<T>(
    name: string, 
    options: { attributes?: Attributes; kind?: SpanKind } = {},
    fn: (span: Span) => Promise<T>
  ): Promise<T> {
    const tracer = trace.getTracer(this.tracerName);
    return tracer.startActiveSpan(name, {
      kind: options.kind || SpanKind.INTERNAL,
      attributes: options.attributes,
    }, async (span): Promise<T> => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Helper to record LLM specific details (Prompt Shape)
   */
  public recordLlmStats(span: Span, stats: {
    model_name: string;
    message_count: number;
    role_sequence: string;
    input_chars: number;
    output_chars: number;
    actual_tokens?: { eval_count?: number; prompt_eval_count?: number };
    estimated_tokens?: { input: number; output: number };
    tools_used?: boolean;
    memory_injected?: boolean;
    temperature?: number;
  }) {
    const attributes: Attributes = {
      'llm.model_name': stats.model_name,
      'llm.message_count': stats.message_count,
      'llm.role_sequence': stats.role_sequence,
      'llm.input_chars': stats.input_chars,
      'llm.output_chars': stats.output_chars,
      'llm.tools_used': stats.tools_used || false,
      'llm.memory_injected': stats.memory_injected || false,
      'llm.temperature': stats.temperature || 0.7,
    };

    if (stats.actual_tokens) {
      attributes['llm.actual_eval_count'] = stats.actual_tokens.eval_count;
      attributes['llm.actual_prompt_eval_count'] = stats.actual_tokens.prompt_eval_count;
    }

    if (stats.estimated_tokens) {
      attributes['llm.estimated_input_tokens'] = stats.estimated_tokens.input;
      attributes['llm.estimated_output_tokens'] = stats.estimated_tokens.output;
    }

    span.setAttributes(attributes);
  }

  /**
   * Helper to record Memory operation details
   */
  public recordMemoryStats(span: Span, stats: {
    operation_type: 'retrieval' | 'write' | 'scoring' | 'reflection';
    memory_type?: string;
    candidates_count?: number;
    selected_ids?: string;
    reasons?: string;
  }) {
    span.setAttributes({
      'memory.operation': stats.operation_type,
      'memory.type': stats.memory_type || 'generic',
      'memory.candidates_count': stats.candidates_count || 0,
      'memory.selected_ids': stats.selected_ids || '',
      'memory.reasons': stats.reasons || '',
    });
  }

  /**
   * recordConsensusStats
   * Record metrics for the multi-agent consensus loop.
   */
  public recordConsensusStats(stats: {
    hallucinationFlagRate: number;
    averageConsensusLatencyMs: number;
    disagreementRate: number;
  }) {
    const tracer = trace.getTracer(this.tracerName);
    const span = tracer.startSpan('consensus_metrics');
    span.setAttributes({
      'consensus.hallucination_flag_rate': stats.hallucinationFlagRate,
      'consensus.average_latency_ms': stats.averageConsensusLatencyMs,
      'consensus.disagreement_rate': stats.disagreementRate,
    });
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  }
}

export const obs = ObservabilityService.getInstance();
