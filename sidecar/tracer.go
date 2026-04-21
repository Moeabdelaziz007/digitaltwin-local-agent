package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
	"go.opentelemetry.io/otel/trace"
)

/**
 * PocketBaseExporter implements sdktrace.SpanExporter
 */
type PocketBaseExporter struct {
	pbURL string
}

func NewPocketBaseExporter(url string) *PocketBaseExporter {
	return &PocketBaseExporter{pbURL: url}
}

func (e *PocketBaseExporter) ExportSpans(ctx context.Context, spans []sdktrace.ReadOnlySpan) error {
	for _, span := range spans {
		if err := e.saveSpan(ctx, span); err != nil {
			log.Printf("[PB Exporter Error] %v", err)
		}
	}
	return nil
}

func (e *PocketBaseExporter) Shutdown(ctx context.Context) error {
	return nil
}

func (e *PocketBaseExporter) saveSpan(ctx context.Context, span sdktrace.ReadOnlySpan) error {
	sCtx := span.SpanContext()
	
	// Attributes conversion
	attrs := make(map[string]interface{})
	for _, kv := range span.Attributes() {
		attrs[string(kv.Key)] = kv.Value.AsInterface()
	}

	record := map[string]interface{}{
		"trace_id":        sCtx.TraceID().String(),
		"span_id":         sCtx.SpanID().String(),
		"parent_span_id":  span.Parent().SpanID().String(),
		"name":            span.Name(),
		"kind":            span.SpanKind().String(),
		"status":          span.Status().Code.String(),
		"start_time":      span.StartTime().Format(time.RFC3339),
		"end_time":        span.EndTime().Format(time.RFC3339),
		"duration_ms":     float64(span.EndTime().Sub(span.StartTime()).Microseconds()) / 1000.0,
		"component":       "sidecar-go",
		"attributes_json": e.redactAttributes(attrs),
		"redaction_level": 1,
	}

	// Session/User info from attributes
	if sID, ok := attrs["session_id"]; ok {
		record["session_id"] = sID
	}
	if uID, ok := attrs["user_id_hash"]; ok {
		record["user_id_hash"] = uID
	}

	data, _ := json.Marshal(record)
	req, _ := http.NewRequestWithContext(ctx, "POST", e.pbURL+"/api/collections/traces/records", bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")

	// Note: In real setup we'd use an admin token here if security is strictly enforced on traces
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("failed to save span: %d", resp.StatusCode)
	}

	return nil
}

func (e *PocketBaseExporter) redactAttributes(attrs map[string]interface{}) map[string]interface{} {
	redacted := make(map[string]interface{})
	piiKeys := []string{"prompt", "content", "fact", "response", "secret", "key", "token", "authorization"}

	for k, v := range attrs {
		isPII := false
		lowerK := strings.ToLower(k)
		for _, pii := range piiKeys {
			if strings.Contains(lowerK, pii) {
				isPII = true
				break
			}
		}

		if isPII {
			if s, ok := v.(string); ok && len(s) > 50 {
				redacted[k] = fmt.Sprintf("[REDACTED: %d chars]", len(s) )
			} else {
				redacted[k] = "[REDACTED]"
			}
		} else {
			redacted[k] = v
		}
	}
	return redacted
}

/**
 * Global Tracer Setup
 */
func initTracer() *sdktrace.TracerProvider {
	exporter := NewPocketBaseExporter(pbURL)
	
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceNameKey.String("digital-twin-sidecar"),
		)),
	)
	
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{}))
	
	return tp
}

/**
 * Propagator interaction
 */
func extractTraceContext(r *http.Request) context.Context {
	return otel.GetTextMapPropagator().Extract(r.Context(), propagation.HeaderCarrier(r.Header))
}
