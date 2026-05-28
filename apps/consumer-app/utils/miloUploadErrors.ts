import {
  MILO_DOCUMENT_FALLBACK_MESSAGE,
  MILO_DOCUMENT_TIMEOUT_MESSAGE,
  MILO_DOCUMENT_UNAVAILABLE_MESSAGE,
  normalizeNonJsonApiError,
} from "@pawbuck/api-client";

const KNOWN_MESSAGES = new Set([
  MILO_DOCUMENT_TIMEOUT_MESSAGE,
  MILO_DOCUMENT_UNAVAILABLE_MESSAGE,
  MILO_DOCUMENT_FALLBACK_MESSAGE,
]);

/** Owner-facing copy for Milo document upload failures — never show raw HTML. */
export function formatMiloUploadError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.trim();
    if (msg && KNOWN_MESSAGES.has(msg)) return msg;
    if (msg && !/<html/i.test(msg)) return msg;
    if (msg) return normalizeNonJsonApiError(504, msg);
  }

  if (typeof error === "string" && error.trim()) {
    return formatMiloUploadError(new Error(error.trim()));
  }

  return MILO_DOCUMENT_FALLBACK_MESSAGE;
}
