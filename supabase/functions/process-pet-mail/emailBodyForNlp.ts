import type { ParsedEmail } from "./types.ts";

const MIN_BODY_CHARS = 40;

const SKIP_SUBJECT_RE =
  /^(re:\s*)?(invoice|receipt|statement|newsletter|unsubscribe|password reset|verification code)/i;

/**
 * Prefer cleaned plain text; fall back to stripped HTML from emailCleaner output.
 */
export function resolveEmailBodyForNlp(parsedEmail: ParsedEmail): string {
  const text = (parsedEmail.textBody ?? "").trim();
  if (text.length >= MIN_BODY_CHARS) return text.slice(0, 8000);

  const html = (parsedEmail.htmlBody ?? "").trim();
  if (!html) return "";

  const fromHtml = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return fromHtml.slice(0, 8000);
}

export function shouldAttemptNlpAppointmentImport(
  parsedEmail: ParsedEmail,
  hasCalendarAttachments: boolean
): boolean {
  if (hasCalendarAttachments) return false;
  const body = resolveEmailBodyForNlp(parsedEmail);
  if (body.length < MIN_BODY_CHARS) return false;
  const subject = (parsedEmail.subject ?? "").trim();
  if (subject && SKIP_SUBJECT_RE.test(subject)) return false;
  return true;
}
