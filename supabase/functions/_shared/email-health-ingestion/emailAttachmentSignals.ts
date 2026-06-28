/**
 * Heuristics for emails that likely included a health document attachment.
 * Used when Mailgun delivers message text but attachment bytes are missing.
 */

const HEALTH_ATTACHMENT_HINT =
  /\b(attach(ed|ment|ments|ing)?|vaccin(e|ation|ations|es)?|certificate|documents?|docuemnts?|records?|pdf|prescription|lab\s*result|medical\s*record|discharge|invoice|receipt|x-?ray|radiograph|pathology|microchip|passport)\b/i;

const HEALTH_FILE_MIME =
  /^(image\/(jpeg|jpg|png|webp|heic|heif)|application\/pdf)$/i;

/** Mailgun may send attachment-count even when our parser could not fetch files. */
export function parseMailgunAttachmentCountField(
  raw: string | null | undefined,
): number | null {
  if (!raw?.trim()) return null;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function emailLikelyHadHealthAttachment(
  subject: string | null | undefined,
  textBody: string | null | undefined,
  htmlBody?: string | null | undefined,
): boolean {
  const combined = [subject, textBody, htmlBody].filter(Boolean).join(" ");
  if (!combined.trim()) return false;
  return HEALTH_ATTACHMENT_HINT.test(combined);
}

export function attachmentLooksLikeHealthDocument(
  mimeType: string | null | undefined,
  filename: string | null | undefined,
): boolean {
  if (mimeType?.trim() && HEALTH_FILE_MIME.test(mimeType.trim())) return true;
  if (filename?.trim() && /\.(pdf|jpe?g|png|webp|heic|heif)$/i.test(filename.trim())) {
    return true;
  }
  return false;
}

/** Attachment bytes arrived but classifier marked every file irrelevant. */
export function emailLooksLikeUnclassifiedHealthAttempt(params: {
  subject?: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
  attachments: { mimeType?: string; filename?: string }[];
}): boolean {
  if (
    emailLikelyHadHealthAttachment(
      params.subject,
      params.textBody,
      params.htmlBody,
    )
  ) {
    return true;
  }
  return params.attachments.some((a) =>
    attachmentLooksLikeHealthDocument(a.mimeType, a.filename)
  );
}

export function shouldTreatAsMissingAttachment(params: {
  extractedCount: number;
  mailgunJsonListed: number;
  mailgunAttachmentCountField: number | null;
  subject: string | null | undefined;
  textBody: string | null | undefined;
  htmlBody?: string | null | undefined;
}): boolean {
  if (params.extractedCount > 0) return false;
  if (params.mailgunJsonListed > 0) return true;
  if ((params.mailgunAttachmentCountField ?? 0) > 0) return true;
  return emailLikelyHadHealthAttachment(
    params.subject,
    params.textBody,
    params.htmlBody,
  );
}

export const MISSING_ATTACHMENT_FAILURE_PREFIX = "attachment_not_received:";

export function formatMissingAttachmentFailureReason(detail: string): string {
  return `${MISSING_ATTACHMENT_FAILURE_PREFIX}${detail}`;
}

export function isMissingAttachmentFailureReason(
  failureReason: string | null | undefined,
): boolean {
  return Boolean(failureReason?.startsWith(MISSING_ATTACHMENT_FAILURE_PREFIX));
}

export function summarizeMissingAttachmentFailure(
  failureReason: string,
): string {
  const detail = failureReason.slice(MISSING_ATTACHMENT_FAILURE_PREFIX.length).trim();
  return detail ||
    "We received your email but could not download the attachment. Try sending again with the PDF attached, or upload from Health Records.";
}
