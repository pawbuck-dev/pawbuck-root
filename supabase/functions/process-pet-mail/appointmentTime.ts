import type { NlpAppointmentCategory } from "./nlpAppointmentTypes.ts";

const GROOMING_DURATION_MS = 2 * 60 * 60 * 1000;
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

/**
 * Parse model local datetime (no offset) and convert wall time in IANA zone to UTC ISO string.
 */
export function wallTimeToUtc(localIso: string, ianaTimezone: string): string | null {
  const trimmed = localIso.trim();
  if (!trimmed) return null;

  const normalized = trimmed.length <= 10 ? `${trimmed}T12:00:00` : trimmed.replace(/\.\d+$/, "");
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const [, y, mo, d, h, mi, s] = match;
  try {
    const plain = Temporal.PlainDateTime.from({
      year: Number(y),
      month: Number(mo),
      day: Number(d),
      hour: Number(h),
      minute: Number(mi),
      second: Number(s ?? "0"),
    });
    const zoned = plain.toZonedDateTime(ianaTimezone);
    return zoned.toInstant().toString();
  } catch (e) {
    console.warn("[appointmentTime] wallTimeToUtc failed", e);
    return null;
  }
}

export function defaultEndFromCategory(
  category: NlpAppointmentCategory,
  startUtcIso: string
): string {
  const start = new Date(startUtcIso);
  if (Number.isNaN(start.getTime())) {
    return new Date(Date.now() + DEFAULT_DURATION_MS).toISOString();
  }
  const delta = category === "grooming" ? GROOMING_DURATION_MS : DEFAULT_DURATION_MS;
  return new Date(start.getTime() + delta).toISOString();
}

export function resolveAppointmentUtcRange(
  extraction: { start_at: string | null; end_at: string | null; category: NlpAppointmentCategory },
  homeTimezone: string
): { startUtc: string; endUtc: string } | null {
  if (!extraction.start_at) return null;
  const startUtc = wallTimeToUtc(extraction.start_at, homeTimezone);
  if (!startUtc) return null;

  let endUtc: string;
  if (extraction.end_at) {
    const parsedEnd = wallTimeToUtc(extraction.end_at, homeTimezone);
    endUtc = parsedEnd ?? defaultEndFromCategory(extraction.category, startUtc);
  } else {
    endUtc = defaultEndFromCategory(extraction.category, startUtc);
  }

  if (new Date(endUtc).getTime() <= new Date(startUtc).getTime()) {
    endUtc = defaultEndFromCategory(extraction.category, startUtc);
  }

  return { startUtc, endUtc };
}
