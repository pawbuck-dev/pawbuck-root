/** Offsets (days before due date) for multi-stage vaccination local reminders. */
export type VaccineReminderOffsetDays = 30 | 7 | 0;

const DEFAULT_OFFSETS: readonly VaccineReminderOffsetDays[] = [30, 7, 0];

function parseLocalDateOnly(iso: string): Date {
  const dayPart = iso.split("T")[0] ?? iso;
  const [y, m, d] = dayPart.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Local calendar reminder fires at 9:00 on each qualifying day (same convention as legacy single reminder).
 * Skips offsets whose fire time is already in the past.
 */
export function computeVaccineReminderFires(
  nextDueDateYmd: string,
  now: Date,
  offsets: readonly VaccineReminderOffsetDays[] = DEFAULT_OFFSETS
): Array<{ offsetDays: VaccineReminderOffsetDays; fireAt: Date }> {
  const due = startOfLocalDay(parseLocalDateOnly(nextDueDateYmd));
  if (Number.isNaN(due.getTime())) return [];

  const today = startOfLocalDay(now);
  const out: Array<{ offsetDays: VaccineReminderOffsetDays; fireAt: Date }> = [];

  for (const offset of offsets) {
    const triggerDay = new Date(due);
    triggerDay.setDate(triggerDay.getDate() - offset);
    if (startOfLocalDay(triggerDay) < today) continue;

    const fireAt = new Date(triggerDay);
    fireAt.setHours(9, 0, 0, 0);
    if (fireAt.getTime() <= now.getTime()) continue;

    out.push({ offsetDays: offset, fireAt });
  }

  return out;
}
