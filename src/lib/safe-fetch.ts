type SafeFetchErrorType = 'timeout' | 'network' | 'http_error' | 'unknown';

type SafeFetchError = {
  type: SafeFetchErrorType;
  message: string;
  details?: string;
};

type SafeFetchOptions = {
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  retryOnStatuses?: number[];
  sessionId?: string;
};

type SafeFetchResult = {
  ok: boolean;
  status: number;
  error?: SafeFetchError;
  response?: Response;
};

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
    attempt,
    error,
  };

  console.error('[safeFetch]', payload);
}

export async function safeFetch(
  url: string,
  init: RequestInit = {},
  opts: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const timeoutMs = opts.timeoutMs ?? 3000;
  const retries = opts.retries ?? 2;
  const backoffMs = opts.backoffMs ?? 250;
  const retryOnStatuses = opts.retryOnStatuses ?? [408, 425, 429, 500, 502, 503, 504];

  let lastError: SafeFetchError | undefined;
  let lastStatus = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
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
      };

      if (attempt < retries && retryOnStatuses.includes(response.status)) {
        await sleep(backoffMs * Math.pow(2, attempt));
        continue;
      }

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
      lastError = {
        type: isTimeout ? 'timeout' : 'network',
        message: isTimeout ? `Request timed out after ${timeoutMs}ms` : 'Network request failed',
        details: serializeError(error),
      };

      if (attempt < retries) {
        await sleep(backoffMs * Math.pow(2, attempt));
        continue;
      }

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
  logSafeFetchFailure(url, fallbackError, opts, retries + 1);
  return {
    ok: false,
    status: lastStatus,
    error: fallbackError,
  };
}
