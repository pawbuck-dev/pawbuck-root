export const MILO_DOCUMENT_TIMEOUT_MESSAGE =
  "Milo took too long to read this document. Please try again — large PDFs can take up to a minute.";

export const MILO_DOCUMENT_UNAVAILABLE_MESSAGE =
  "Milo is temporarily unavailable. Please try again in a moment.";

export const MILO_DOCUMENT_FALLBACK_MESSAGE =
  "Could not analyze this document. Please try again.";

const KNOWN_MESSAGES = new Set([
  MILO_DOCUMENT_TIMEOUT_MESSAGE,
  MILO_DOCUMENT_UNAVAILABLE_MESSAGE,
  MILO_DOCUMENT_FALLBACK_MESSAGE,
]);

function normalizeHtmlGatewayError(rawText: string): string {
  const trimmed = rawText.trim();
  if (
    /<html/i.test(trimmed) &&
    (/504|gateway time-out|gateway timeout/i.test(trimmed))
  ) {
    return MILO_DOCUMENT_TIMEOUT_MESSAGE;
  }
  if (/gateway time-out|gateway timeout/i.test(trimmed)) {
    return MILO_DOCUMENT_TIMEOUT_MESSAGE;
  }
  if (/<html/i.test(trimmed)) {
    return MILO_DOCUMENT_FALLBACK_MESSAGE;
  }
  return trimmed;
}

/** Owner-facing copy for Milo document upload failures — never show raw HTML. */
export function formatMiloUploadError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.trim();
    if (msg && KNOWN_MESSAGES.has(msg)) return msg;
    if (msg && !/<html/i.test(msg)) return msg;
    if (msg) return normalizeHtmlGatewayError(msg);
  }

  if (typeof error === "string" && error.trim()) {
    return formatMiloUploadError(new Error(error.trim()));
  }

  return MILO_DOCUMENT_FALLBACK_MESSAGE;
}
