/**
 * Shared HTTP error parsing and retry for PawBuck.API mobile clients.
 */

export const MILO_DOCUMENT_TIMEOUT_MESSAGE =
  "Milo took too long to read this document. Please try again — large PDFs can take up to a minute.";

export const MILO_DOCUMENT_UNAVAILABLE_MESSAGE =
  "Milo is temporarily unavailable. Please try again in a moment.";

export const MILO_DOCUMENT_FALLBACK_MESSAGE =
  "Could not analyze this document. Please try again.";

const RETRYABLE_HTTP_STATUSES = new Set([502, 503, 504]);

export function isRetryableHttpStatus(status: number): boolean {
  return RETRYABLE_HTTP_STATUSES.has(status);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Normalize API/ALB error bodies so mobile alerts never show raw HTML. */
export function normalizeNonJsonApiError(status: number, rawText: string): string {
  const trimmed = rawText.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { error?: string; message?: string };
      const msg = parsed.error?.trim() || parsed.message?.trim();
      if (msg && !/<html/i.test(msg)) return msg;
    } catch {
      // fall through
    }
  }

  if (
    /<html/i.test(trimmed) &&
    (/504|gateway time-out|gateway timeout/i.test(trimmed) || status === 504)
  ) {
    return MILO_DOCUMENT_TIMEOUT_MESSAGE;
  }

  if (status === 504 || /gateway time-out|gateway timeout/i.test(trimmed)) {
    return MILO_DOCUMENT_TIMEOUT_MESSAGE;
  }

  if (isRetryableHttpStatus(status)) {
    return MILO_DOCUMENT_UNAVAILABLE_MESSAGE;
  }

  if (/<html/i.test(trimmed)) {
    return MILO_DOCUMENT_FALLBACK_MESSAGE;
  }

  if (trimmed.length > 280) {
    return `${trimmed.slice(0, 280)}…`;
  }

  return trimmed || MILO_DOCUMENT_FALLBACK_MESSAGE;
}

export function parseApiResponseBody(status: number, text: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    throw new Error(normalizeNonJsonApiError(status, text));
  }

  throw new Error(normalizeNonJsonApiError(status, text));
}

export function extractApiErrorMessage(
  status: number,
  body: Record<string, unknown>,
  rawText: string
): string {
  const fromBody =
    typeof body.error === "string"
      ? body.error.trim()
      : typeof body.message === "string"
        ? body.message.trim()
        : "";
  if (fromBody && !/<html/i.test(fromBody)) return fromBody;
  return normalizeNonJsonApiError(status, rawText);
}

export type FetchWithRetryOptions = {
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
};

/** Retry 502/503/504 with linear backoff (1s, 2s) — mirrors Edge analyze-internal. */
export async function fetchWithRetry(
  fn: () => Promise<Response>,
  options?: FetchWithRetryOptions
): Promise<Response> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const delay = options?.sleep ?? sleep;

  let lastResponse: Response | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fn();
    lastResponse = response;
    if (response.ok || !isRetryableHttpStatus(response.status) || attempt >= maxAttempts) {
      return response;
    }
    await delay(1000 * attempt);
  }

  return lastResponse!;
}
