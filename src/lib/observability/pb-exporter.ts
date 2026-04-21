import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { SpanExporter, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { Attributes } from '@opentelemetry/api';
import PocketBase from 'pocketbase';

/**
 * PocketBaseSpanExporter
 * A production-grade OTel SpanExporter that writes spans to PocketBase.
 * Implements asynchronous batching to ensure minimal impact on the request lifecycle.
 */
export class PocketBaseSpanExporter implements SpanExporter {
  private pb: PocketBase;
  private collectionName: string = 'traces';
  private batch: ReadableSpan[] = [];
  private batchSize: number = 20;
  private flushTimeout: NodeJS.Timeout | null = null;
  private flushInterval: number = 2000; // 2 seconds

  constructor(pbUrl: string) {
    this.pb = new PocketBase(pbUrl);
    this.pb.autoCancellation(false);
  }

  /**
   * Export spans to PocketBase
   */
  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    this.batch.push(...spans);

    if (this.batch.length >= this.batchSize) {
      this.flush()
        .then(() => resultCallback({ code: ExportResultCode.SUCCESS }))
        .catch(() => resultCallback({ code: ExportResultCode.FAILED }));
    } else {
      this.scheduleFlush();
      resultCallback({ code: ExportResultCode.SUCCESS });
    }
  }

  /**
   * Force flush all buffered spans
   */
  async shutdown(): Promise<void> {
    await this.flush();
  }

  /**
   * Schedule a flush if not already scheduled
   */
  private scheduleFlush(): void {
    if (this.flushTimeout) return;
    this.flushTimeout = setTimeout(() => this.flush(), this.flushInterval);
  }

  /**
   * Perform the actual persistence to PocketBase
   */
  private async flush(): Promise<void> {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    if (this.batch.length === 0) return;

    const spansToExport = [...this.batch];
    this.batch = [];

    try {
      // In a real production OTel exporter, we might use a bulk import API if available.
      // PocketBase doesn't have a native bulk JSON import via SDK easily, so we process in chunks.
      // We use Promise.all to trigger concurrent requests, but capped to avoid overwhelming PB.
      const chunks = this.chunkArray(spansToExport, 5);
      
      for (const chunk of chunks) {
        await Promise.all(chunk.map(span => this.saveSpan(span)));
      }
    } catch (error) {
      console.error('[PB_EXPORTER] Failed to flush spans:', error);
    }
  }

  /**
   * Maps an OTel span to the PocketBase schema and saves it
   */
  private async saveSpan(span: ReadableSpan): Promise<void> {
    const { traceId, spanId } = span.spanContext();
    const parentSpanId = span.parentSpanId || '';
    const startTime = this.hrTimeToDate(span.startTime);
    const endTime = this.hrTimeToDate(span.endTime);
    const durationMs = span.duration[0] * 1000 + span.duration[1] / 1000000;

    const attributes = span.attributes;
    const sessionId = attributes['session_id'] as string || '';
    const userIdHash = attributes['user_id_hash'] as string || '';
    const requestType = attributes['request_type'] as string || '';
    const component = attributes['component'] as string || 'nextjs';

    // Filter out potential PII from attributes if needed, though Next.js instrumentation
    // usually handles basic redacting.
    const record = {
      trace_id: traceId,
      span_id: spanId,
      parent_span_id: parentSpanId || '',
      name: span.name,
      kind: span.kind.toString(),
      status: span.status.code.toString(), // 0=Unset, 1=Ok, 2=Error
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_ms: durationMs,
      session_id: sessionId,
      user_id_hash: userIdHash,
      request_type: requestType,
      component: component,
      attributes_json: this.redactAttributes(attributes),
      events_json: span.events,
      links_json: span.links,
      redaction_level: 1, // Phase 4 active
    };

    try {
      await this.pb.collection(this.collectionName).create(record);
    } catch {
      // Silently fail to avoid crashing the main app execution
    }
  }

  /**
   * PII Redaction logic for span attributes.
   * Ensures raw text, keys, and tokens are never persisted in plain text.
   */
  private redactAttributes(attributes: Attributes): Attributes {
    const redacted: Attributes = { ...attributes };
    const piiKeys = ['prompt', 'content', 'fact', 'response', 'secret', 'key', 'token', 'authorization'];
    
    for (const key of Object.keys(redacted)) {
      const lowerKey = key.toLowerCase();
      if (piiKeys.some(pii => lowerKey.includes(pii))) {
        const val = redacted[key];
        if (typeof val === 'string' && val.length > 50) {
          redacted[key] = `[REDACTED: ${val.length} chars]`;
        } else {
          redacted[key] = '[REDACTED]';
        }
      }
    }
    return redacted;
  }

  /**
   * Utility to convert OTel HrTime to Date object
   */
  private hrTimeToDate(hrTime: [number, number]): Date {
    return new Date(hrTime[0] * 1000 + hrTime[1] / 1000000);
  }

  /**
   * Segment array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }
}
