# Braintrust + OpenTelemetry Integration

## Setup Complete ✅

تم إعداد Braintrust و OpenTelemetry بنجاح في المشروع.

## What Was Configured

### 1. Environment Variables (`.env.local`)
```env
BRAINTRUST_API_KEY="bt-st-GY1Fuva1tryDgdrpYfzFa8sZC3812RQT14LU89EsJZR0117z"
BRAINTRUST_PROJECT_ID="4e2c7d63-2ef2-479e-a7c3-aaf16b7b81c6"
```

### 2. Dependencies Installed
- `braintrust@3.9.0` - Braintrust SDK
- `@vercel/otel@2.1.2` - Vercel OpenTelemetry wrapper

### 3. Files Modified

#### `src/instrumentation.ts`
- Added `registerOTel` from `@vercel/otel`
- Configured OpenTelemetry initialization on server startup

#### `src/lib/observability/observability-service.ts`
- Imported `init` and `registerOtelFlush` from braintrust
- Added Braintrust initialization in the `init()` method
- Registered OTel flush with Braintrust to ensure traces are sent
- Maintains dual export: PocketBase (local) + Braintrust (cloud)

## How It Works

1. **On Server Start**: `instrumentation.ts` calls `registerOTel()` to configure OpenTelemetry
2. **Observability Service**: Initializes both PocketBase and Braintrust exporters
3. **Trace Flow**: All spans are exported to:
   - **PocketBase**: Local storage for offline/development
   - **Braintrust**: Cloud platform for analysis and evaluation

## Usage

### Tracing Functions
```typescript
import { obs } from '@/lib/observability/observability-service';

// Trace any async operation
await obs.trace('operation-name', { attributes: { key: 'value' } }, async (span) => {
  // Your code here
  span.setAttributes({ 'custom.attr': 'value' });
  return result;
});

// Record LLM statistics
obs.recordLlmStats(span, {
  model_name: 'qwen2.5:3b',
  message_count: 5,
  role_sequence: 'user-assistant-user-assistant',
  input_chars: 1200,
  output_chars: 800,
});

// Record memory operations
obs.recordMemoryStats(span, {
  operation_type: 'retrieval',
  memory_type: 'hot',
  candidates_count: 10,
});
```

## Viewing Traces

- **Braintrust Dashboard**: https://www.braintrust.dev/
- Navigate to your project: `4e2c7d63-2ef2-479e-a7c3-aaf16b7b81c6`
- View traces, spans, and performance metrics

## Notes

- Traces are automatically flushed on server shutdown
- Both local (PocketBase) and cloud (Braintrust) exporters work in parallel
- Configuration is server-side only (no client-side bundling issues)
- Peer dependency warnings for OpenTelemetry versions are non-critical
