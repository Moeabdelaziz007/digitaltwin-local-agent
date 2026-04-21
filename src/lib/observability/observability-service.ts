import { 
  trace, 
  Span, 
  SpanStatusCode, 
  SpanKind,
  Attributes
} from '@opentelemetry/api';
import * as resources from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { PocketBaseSpanExporter } from './pb-exporter';
import { env } from '@/lib/env';

/**
 * ObservabilityService
 * Central management for tracing and telemetry.
 */
export class ObservabilityService {
  private static instance: ObservabilityService;
  private sdk: NodeSDK | null = null;
  private tracerName: string = 'digital-twin-core';

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
  public init() {
    if (this.sdk) return;

    const exporter = new PocketBaseSpanExporter(env.POCKETBASE_URL);
    
    this.sdk = new NodeSDK({
      resource: new resources.Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'digital-twin-app',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
      }),
      spanProcessor: new BatchSpanProcessor(exporter),
      instrumentations: [], // We'll do manual instrumentation for precision
    });

    this.sdk.start();
    console.log('[OBSERVABILITY] OTel SDK Started with PocketBase Exporter');
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
    }, async (span) => {
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
}

export const obs = ObservabilityService.getInstance();
