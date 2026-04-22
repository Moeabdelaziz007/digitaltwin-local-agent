import { obs } from '@/lib/observability/observability-service';

/**
 * Enhanced SafeFetch Error Types
 */
export type SafeFetchErrorType = 'timeout' | 'network' | 'http_error' | 'circuit_breaker' | 'unknown';

export type SafeFetchError = {
  type: SafeFetchErrorType;
  message: string;
  details?: string;
  status?: number;
};

export type SafeFetchOptions = {
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  retryOnStatuses?: number[];
  sessionId?: string;
  traceId?: string;
  signal?: AbortSignal;
  /** If true, the circuit breaker pattern will be applied to this host */
  useCircuitBreaker?: boolean;
};

export type SafeFetchResult = {
  ok: boolean;
  status: number;
  error?: SafeFetchError;
  response?: Response;
};

// Simple In-Memory Circuit Breaker State
const CIRCUIT_BREAKER_STATES: Record<string, { failures: number; lastFailure: number; isOpen: boolean }> = {};
const FAILURE_THRESHOLD = 5;
const RECOVERY_TIMEOUT = 30000; // 30 seconds

function getHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'unknown';
  }
}

function updateCircuitBreaker(url: string, isSuccess: boolean) {
  const host = getHost(url);
  if (!CIRCUIT_BREAKER_STATES[host]) {
    CIRCUIT_BREAKER_STATES[host] = { failures: 0, lastFailure: 0, isOpen: false };
  }

  const state = CIRCUIT_BREAKER_STATES[host];

  if (isSuccess) {
    state.failures = 0;
    state.isOpen = false;
  } else {
    state.failures++;
    state.lastFailure = Date.now();
    if (state.failures >= FAILURE_THRESHOLD) {
      state.isOpen = true;
    }
  }
}

function isCircuitOpen(url: string): boolean {
  const host = getHost(url);
  const state = CIRCUIT_BREAKER_STATES[host];
  if (!state || !state.isOpen) return false;

  if (Date.now() - state.lastFailure > RECOVERY_TIMEOUT) {
    // Half-open state: allow one try
    return false;
  }
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function serializeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : JSON.stringify(error);
}

function logSafeFetchFailure(url: string, error: SafeFetchError, opts: SafeFetchOptions, attempt: number) {
  const payload = {
    event: 'safe_fetch_failure',
    url,
    session_id: opts.sessionId ?? null,
    trace_id: opts.traceId ?? null,
    attempt,
    error,
  };

  console.error(`[safeFetch][${error.type.toUpperCase()}]`, JSON.stringify(payload));

  try {
    obs.recordConsensusStats?.({
      averageConsensusLatencyMs: 0,
      disagreementRate: 0,
      hallucinationFlagRate: 1, 
    });
  } catch {
    // Silent fail
  }
}

/**
 * safeFetch
 * A production-grade fetch wrapper with timeout, retries, circuit breaker, and deep observability.
 */
export async function safeFetch(
  url: string,
  init: RequestInit = {},
  opts: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const timeoutMs = opts.timeoutMs ?? 30000;
  const retries = opts.retries ?? 2;
  const backoffMs = opts.backoffMs ?? 500;
  const retryOnStatuses = opts.retryOnStatuses ?? [408, 425, 429, 500, 502, 503, 504];

  if (opts.useCircuitBreaker && isCircuitOpen(url)) {
    const cbError: SafeFetchError = {
      type: 'circuit_breaker',
      message: `Circuit breaker is OPEN for ${getHost(url)}`,
    };
    return { ok: false, status: 503, error: cbError };
  }

  let lastError: SafeFetchError | undefined;
  let lastStatus = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    // Merge external signal if provided
    if (opts.signal) {
      opts.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'X-Session-ID': opts.sessionId ?? '',
          'X-Trace-ID': opts.traceId ?? '',
          ...init.headers,
        },
      });

      clearTimeout(timeout);

      if (response.ok) {
        if (opts.useCircuitBreaker) updateCircuitBreaker(url, true);
        return {
          ok: true,
          status: response.status,
          response,
        };
      }

      lastStatus = response.status;
      lastError = {
        type: 'http_error',
        message: `HTTP ${response.status}`,
        status: response.status,
      };

      if (attempt < retries && retryOnStatuses.includes(response.status)) {
        await sleep(backoffMs * Math.pow(2, attempt));
        continue;
      }

      if (opts.useCircuitBreaker) updateCircuitBreaker(url, false);
      logSafeFetchFailure(url, lastError, opts, attempt + 1);
      return {
        ok: false,
        status: response.status,
        error: lastError,
        response,
      };
    } catch (error) {
      clearTimeout(timeout);

      const isTimeout = error instanceof Error && error.name === 'AbortError';
      const isExternalAbort = opts.signal?.aborted;

      lastError = {
        type: isTimeout ? 'timeout' : 'network',
        message: isExternalAbort 
          ? 'Request aborted by user' 
          : (isTimeout ? `Request timed out after ${timeoutMs}ms` : 'Network request failed'),
        details: serializeError(error),
      };

      if (!isExternalAbort && attempt < retries) {
        await sleep(backoffMs * Math.pow(2, attempt));
        continue;
      }

      if (opts.useCircuitBreaker) updateCircuitBreaker(url, false);
      logSafeFetchFailure(url, lastError, opts, attempt + 1);
      return {
        ok: false,
        status: lastStatus,
        error: lastError,
      };
    }
  }

  const fallbackError = lastError ?? {
    type: 'unknown' as const,
    message: 'Unknown safeFetch failure',
  };
  return {
    ok: false,
    status: lastStatus,
    error: fallbackError,
  };
}
