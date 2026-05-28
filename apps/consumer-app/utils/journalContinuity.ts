import { subtypeLabel, type JournalDomain } from "@/constants/petJournal";
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

/** Uppercase meta line for latest-entry row (e.g. "3 DAYS AGO"). */
export function formatLastEntryMeta(entryDate: string): string {
  return formatEntryDateRelative(entryDate).toUpperCase();
}

/**
 * Turn imperative routine logs ("Log 2 bowls of food for Milo") into past-tense display copy.
 * Raw note text is unchanged in the database.
 */
export function humanizeRoutineJournalNote(
  note: string | null | undefined,
  petName?: string
): string | null {
  const trimmed = note?.trim();
  if (!trimmed) return null;

  let text = trimmed;
  if (petName?.trim()) {
    const escaped = petName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(`\\s+for\\s+${escaped}\\s*$`, "i"), "");
  }
  text = text.replace(/\s+for\s+(your\s+pet|them)\s*$/i, "").trim();

  const bowl = /^log\s+(\d+)\s+bowls?\s+of\s+food\s*$/i.exec(text);
  if (bowl) {
    const n = Number(bowl[1]);
    return n === 1 ? "1 meal logged" : `${n} meals logged`;
  }
  const glasses = /^log\s+(\d+)\s+glasses?\s+of\s+water\s*$/i.exec(text);
  if (glasses) {
    const n = Number(glasses[1]);
    return n === 1 ? "1 cup of water logged" : `${n} cups of water logged`;
  }
  if (/^log\s+/i.test(text)) {
    const rest = text.replace(/^log\s+/i, "").trim();
    if (!rest) return trimmed;
    const cap = rest.charAt(0).toUpperCase() + rest.slice(1);
    return /logged$/i.test(cap) ? cap : `${cap} logged`;
  }
  return trimmed;
}

function truncateAtWord(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const slice = text.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > maxLen * 0.6) return `${slice.slice(0, lastSpace)}…`;
  return `${slice}…`;
}

/** Headline from note body for home journal card. */
export function formatLatestEntryTitle(
  note: string | null | undefined,
  maxLen = 80,
  petName?: string
): string {
  const display = humanizeRoutineJournalNote(note, petName) ?? note?.trim();
  if (!display) return "Journal entry";
  return truncateAtWord(display, maxLen);
}

function humanizeTriageStatus(status: string | null | undefined): string | null {
  const s = status?.trim().toLowerCase();
  if (!s || s === "none") return null;
  return s.replace(/_/g, " ");
}

/** Secondary line under latest entry title (subtype, triage, vet context). */
export function formatLatestEntrySubtitle(entry: PetJournalEntry): string {
  const domain = entry.domain as JournalDomain;
  const typeLabel =
    domain === "health" || domain === "behavioral" || domain === "environmental"
      ? subtypeLabel(domain, entry.subtype)
      : formatSubtypeLabel(entry.subtype);

  const parts: string[] = [typeLabel];
  const triage = humanizeTriageStatus(entry.triage_status);
  if (triage) parts.push(triage);
  if (entry.vet_flagged && entry.domain === "health") {
    parts.push("vet flagged");
  }
  return parts.join(" · ");
}

/** Count entries with entry_date on or after the start of the window (calendar days). */
export function countEntriesInWindow(entries: PetJournalEntry[], days: number): number {
  if (days <= 0) return entries.length;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  return entries.filter((e) => {
    const day = e.entry_date?.slice(0, 10);
    if (!day) return false;
    const d = new Date(`${day}T12:00:00`);
    return !Number.isNaN(d.getTime()) && d >= start;
  }).length;
}

export function formatJournalEntryCountLabel(count: number, windowDays?: number): string {
  if (count === 0) return "No entries yet";
  const noun = count === 1 ? "entry" : "entries";
  if (windowDays != null && windowDays > 0) {
    return `${count} ${noun} · last ${windowDays} days`;
  }
  return `${count} ${noun}`;
}

/** Home journal card link — e.g. "View all" or "View all · 2 this week". */
export function formatJournalViewAllLabel(count: number, windowDays?: number): string {
  if (count <= 0) return "View all";
  const noun = count === 1 ? "entry" : "entries";
  if (windowDays === 7) return `View all · ${count} ${noun} this week`;
  if (windowDays != null && windowDays > 0) {
    return `View all · ${count} ${noun} · last ${windowDays} days`;
  }
  return `View all · ${count} ${noun}`;
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
