import type { ParsedAttachment, ParsedEmail } from "./types.ts";

const GOOGLE_CALENDAR_SENDER_RE =
  /(@google\.com$|calendar-notification@google\.com|@group\.calendar\.google\.com$)/i;

const GOOGLE_INVITE_SUBJECT_RE = /^invitation:\s/i;

const GOOGLE_INVITE_BODY_RE =
  /\b(you have been invited|invitation from google calendar|join with google meet|view on google calendar)\b/i;

export type StructuredCalendarInvite = {
  summary: string;
  location: string | null;
  /** UTC ISO 8601 */
  startUtc: string;
  /** UTC ISO 8601 */
  endUtc: string | null;
  source: "google_html" | "google_text";
};

export function isGoogleCalendarInviteEmail(parsedEmail: ParsedEmail): boolean {
  const from = parsedEmail.from?.address ?? "";
  const subject = parsedEmail.subject ?? "";
  const body = [parsedEmail.textBody, parsedEmail.htmlBody].filter(Boolean).join("\n");

  if (GOOGLE_CALENDAR_SENDER_RE.test(from)) return true;
  if (GOOGLE_INVITE_SUBJECT_RE.test(subject.trim())) return true;
  if (GOOGLE_INVITE_BODY_RE.test(body)) return true;
  if (/\bcalendar\.google\.com\/calendar\/event\b/i.test(body)) return true;
  return false;
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function icsTextToAttachment(icsText: string, index: number): ParsedAttachment {
  const trimmed = icsText.trim();
  return {
    filename: `inline-calendar-${index}.ics`,
    mimeType: "text/calendar",
    size: trimmed.length,
    content: utf8ToBase64(trimmed),
  };
}

export function extractVCalendarBlocks(raw: string): string[] {
  if (!raw.trim()) return [];
  const blocks: string[] = [];
  const re = /BEGIN:VCALENDAR[\s\S]*?END:VCALENDAR/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw)) !== null) {
    blocks.push(match[0]!);
  }
  return blocks;
}

function extractBase64CalendarFromHtml(html: string): string[] {
  const results: string[] = [];
  const re = /data:text\/calendar[^;]*;base64,([A-Za-z0-9+/=\s]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    try {
      const decoded = atob(match[1]!.replace(/\s/g, ""));
      if (decoded.includes("BEGIN:VCALENDAR")) results.push(decoded);
    } catch {
      // ignore invalid base64
    }
  }
  return results;
}

/** Scan email bodies for embedded VCALENDAR content (common when Mailgun omits calendar MIME parts). */
export function extractInlineIcsAttachments(parsedEmail: ParsedEmail): ParsedAttachment[] {
  const seen = new Set<string>();
  const attachments: ParsedAttachment[] = [];

  const addBlock = (icsText: string) => {
    const normalized = icsText.trim();
    if (!normalized.includes("BEGIN:VEVENT")) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    attachments.push(icsTextToAttachment(normalized, attachments.length));
  };

  for (const body of [parsedEmail.textBody, parsedEmail.htmlBody]) {
    if (!body) continue;
    for (const block of extractVCalendarBlocks(body)) addBlock(block);
    if (body === parsedEmail.htmlBody) {
      for (const block of extractBase64CalendarFromHtml(body)) addBlock(block);
    }
  }

  return attachments;
}

export function mergeCalendarAttachments(
  mailgunAttachments: ParsedAttachment[],
  parsedEmail: ParsedEmail,
): ParsedAttachment[] {
  const merged = [...mailgunAttachments];
  const existingKeys = new Set(
    mailgunAttachments.map((a) => `${a.filename}:${a.size}:${a.content.slice(0, 32)}`),
  );

  for (const inline of extractInlineIcsAttachments(parsedEmail)) {
    const key = `${inline.filename}:${inline.size}:${inline.content.slice(0, 32)}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    merged.push(inline);
  }

  return merged;
}

function extractItempropMeta(html: string, prop: string): string | null {
  const forward = new RegExp(
    `itemprop=["']${prop}["'][^>]*content=["']([^"']+)["']`,
    "i",
  );
  const reverse = new RegExp(
    `content=["']([^"']+)["'][^>]*itemprop=["']${prop}["']`,
    "i",
  );
  return html.match(forward)?.[1]?.trim() ?? html.match(reverse)?.[1]?.trim() ?? null;
}

/** Parse Google compact or ISO datetime from schema.org meta tags. */
export function parseGoogleCalendarDateTime(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const compact = trimmed.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/i);
  if (compact) {
    const [, y, mo, d, h, mi, s, z] = compact;
    if (z) return `${y}-${mo}-${d}T${h}:${mi}:${s}.000Z`;
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`).toISOString();
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function extractFromGoogleHtml(html: string): StructuredCalendarInvite | null {
  const startRaw = extractItempropMeta(html, "startDate");
  const startUtc = startRaw ? parseGoogleCalendarDateTime(startRaw) : null;
  if (!startUtc) return null;

  const endRaw = extractItempropMeta(html, "endDate");
  const endUtc = endRaw ? parseGoogleCalendarDateTime(endRaw) : null;

  const summary =
    extractItempropMeta(html, "name")?.trim() ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
    "Calendar event";

  const location = extractItempropMeta(html, "location")?.trim() || null;

  return {
    summary: summary.slice(0, 500),
    location: location?.slice(0, 500) ?? null,
    startUtc,
    endUtc,
    source: "google_html",
  };
}

function stripInvitationPrefix(subject: string): string | null {
  const match = subject.trim().match(/^invitation:\s*(.+?)(?:\s*@\s*.+)?$/i);
  return match?.[1]?.trim() ?? null;
}

function parseGoogleWhenLine(whenLine: string, referenceYear: number): {
  startLocal: string;
  endLocal: string | null;
} | null {
  const cleaned = whenLine.replace(/\s+/g, " ").trim();
  const rangeMatch = cleaned.match(
    /([A-Za-z]{3,9},?\s+[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2}).*?(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[–—-]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
  );
  if (!rangeMatch) return null;

  const [, datePart, startTime, endTime] = rangeMatch;
  const dateWithYear = /\d{4}/.test(datePart) ? datePart : `${datePart} ${referenceYear}`;
  const start = parseGooglePlainDateTime(`${dateWithYear} ${startTime}`);
  const end = parseGooglePlainDateTime(`${dateWithYear} ${endTime}`);
  if (!start) return null;
  return { startLocal: start, endLocal: end };
}

function normalizeMeridiemTime(value: string): string {
  return value
    .trim()
    .replace(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i, (_match, hour, minute, meridiem) => {
      const h = Number.parseInt(hour, 10);
      const m = minute ? Number.parseInt(minute, 10) : 0;
      const suffix = meridiem.toUpperCase();
      return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
    });
}

function parseGooglePlainDateTime(value: string): string | null {
  const normalized = normalizeMeridiemTime(value.replace(/\s+/g, " ").trim());
  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) return null;
  const d = new Date(parsed);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function extractFromGooglePlainText(
  textBody: string | null,
  subject: string | null,
  referenceYear: number,
): StructuredCalendarInvite | null {
  if (!textBody?.trim()) return null;

  const whenBlock = textBody.match(/\bwhen\b[\s:]*\n?\s*([^\n]+)/i);
  const whenLine = whenBlock?.[1]?.replace(/\([^)]*\)/g, "").trim();
  const range = whenLine ? parseGoogleWhenLine(whenLine, referenceYear) : null;
  if (!range) return null;

  const titleFromSubject = subject ? stripInvitationPrefix(subject) : null;
  const titleFromBody = textBody.match(/\n\n([^\n]+)\n(?:[A-Za-z]+day|\d)/)?.[1]?.trim();
  const summary = (titleFromSubject || titleFromBody || "Calendar event").slice(0, 500);

  const locationMatch = textBody.match(/\bwhere\b[\s:]*([^\n]+)/i);
  const location = locationMatch?.[1]?.trim().slice(0, 500) ?? null;

  const startUtc = new Date(range.startLocal).toISOString();
  const endUtc = range.endLocal ? new Date(range.endLocal).toISOString() : null;

  return {
    summary,
    location,
    startUtc,
    endUtc,
    source: "google_text",
  };
}

export function extractGoogleCalendarStructuredInvite(
  parsedEmail: ParsedEmail,
  referenceYear: number,
): StructuredCalendarInvite | null {
  if (!isGoogleCalendarInviteEmail(parsedEmail)) return null;

  if (parsedEmail.htmlBody) {
    const fromHtml = extractFromGoogleHtml(parsedEmail.htmlBody);
    if (fromHtml) return fromHtml;
  }

  return extractFromGooglePlainText(
    parsedEmail.textBody,
    parsedEmail.subject,
    referenceYear,
  );
}
