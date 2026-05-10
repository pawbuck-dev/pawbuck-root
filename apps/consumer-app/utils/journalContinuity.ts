import type { PetJournalEntry } from "@/services/petJournal";

/** Humanize journal subtype for a one-line label (no raw note text). */
function formatSubtypeLabel(subtype: string | null | undefined): string {
  if (!subtype?.trim()) return "Journal";
  return subtype.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Calendar day relative to today for entry_date (YYYY-MM-DD).
 */
export function formatEntryDateRelative(entryDate: string): string {
  const day = entryDate.slice(0, 10);
  const d = new Date(`${day}T12:00:00`);
  if (Number.isNaN(d.getTime())) return day;

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diffMs = today.getTime() - d.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  if (diffDays >= 7 && diffDays < 14) return "last week";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** One-line continuity copy for home health card (no PII from note body). */
export function formatLastJournalContinuityLine(
  latest: PetJournalEntry | undefined
): string | null {
  if (!latest?.entry_date) return null;
  const when = formatEntryDateRelative(latest.entry_date);
  const label = formatSubtypeLabel(latest.subtype);
  return `Last logged ${when} · ${label}`;
}
