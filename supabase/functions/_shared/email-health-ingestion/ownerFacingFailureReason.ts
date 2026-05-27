/**
 * Owner-friendly failure text for Review Inbox and push notifications (no app update needed).
 */

const CONFIRM_HINT =
  "Open Messages → Processing errors → Confirm and choose the document type.";

/** Normalize analyze-internal / API error strings for display. */
export function formatOwnerFacingApiError(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return `Could not file this document. ${CONFIRM_HINT}`;

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { error?: string; message?: string };
      const msg = parsed.error?.trim() || parsed.message?.trim();
      if (msg) return formatOwnerFacingApiError(msg);
    } catch {
      // fall through
    }
  }

  if (
    /<html/i.test(trimmed) &&
    (/504|gateway time-out|gateway timeout/i.test(trimmed))
  ) {
    return `Filing timed out (server busy). ${CONFIRM_HINT}`;
  }

  if (/analyze-internal not configured/i.test(trimmed)) {
    return `Email filing is temporarily unavailable (server setup). Our team has been notified. ${CONFIRM_HINT}`;
  }

  if (/Failed to extract data/i.test(trimmed)) {
    return `We could not read this document automatically. ${CONFIRM_HINT}`;
  }

  if (trimmed.length > 280) {
    return `${trimmed.slice(0, 280)}… ${CONFIRM_HINT}`;
  }

  return `${trimmed} ${CONFIRM_HINT}`;
}

export function formatOwnerFacingAttachmentFailure(
  filename: string | undefined,
  detail: string,
): string {
  const prefix = filename ? `Document '${filename}': ` : "";
  return `${prefix}${formatOwnerFacingApiError(detail)}`;
}

export function formatOwnerFacingEmailFailureSummary(
  failedCount: number,
  reasons: string[],
): string {
  const joined = reasons.join("; ");
  const base =
    failedCount === 1
      ? `We could not add 1 document to the pet profile. ${joined}`
      : `We could not add ${failedCount} documents to the pet profile. ${joined}`;
  if (base.includes(CONFIRM_HINT)) return base;
  return `${base} ${CONFIRM_HINT}`;
}

export { CONFIRM_HINT };
