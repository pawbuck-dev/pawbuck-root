import type { PetJournalEntry } from "@/services/petJournal";

export const ALL_GOOD_TODAY_CHIP = "All good today";

const SYMPTOM_TOPIC_CHIPS = [
  "Vomiting or diarrhea",
  "Lethargic today",
  "Changed appetite",
  "Scratching a lot",
  "Limping",
  "Coughing",
  "Eye or ear issue",
] as const;

const WELLNESS_RECOVERY_PHRASES = [
  "all good today",
  "back to normal",
  "doing well",
  "feeling better",
  "resolved",
  "no issues",
  "symptom free",
  "symptoms resolved",
];

const SYMPTOM_KEYWORDS = [
  "vomit",
  "diarr",
  "letharg",
  "limp",
  "cough",
  "itch",
  "scratch",
  "appetite",
  "off food",
  "not eating",
  "eye",
  "ear",
  "pain",
  "blood",
  "symptom",
  "tired",
  "energy",
];

function entryDay(entry: PetJournalEntry): string {
  return entry.entry_date?.slice(0, 10) ?? "";
}

function parseEntryDate(entry: PetJournalEntry): Date | null {
  const day = entryDay(entry);
  if (!day) return null;
  const d = new Date(`${day}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function noteBlob(entry: PetJournalEntry): string {
  return `${entry.subtype ?? ""} ${entry.note ?? ""}`.toLowerCase();
}

export function isWellnessRecoveryEntry(entry: PetJournalEntry): boolean {
  const blob = noteBlob(entry);
  return WELLNESS_RECOVERY_PHRASES.some((phrase) => blob.includes(phrase));
}

export function isIssueJournalEntry(entry: PetJournalEntry): boolean {
  if (isWellnessRecoveryEntry(entry)) return false;
  if (entry.subtype === "symptom") return true;
  const blob = noteBlob(entry);
  if (SYMPTOM_KEYWORDS.some((keyword) => blob.includes(keyword))) return true;
  if (
    entry.subtype === "diet" &&
    /\b(log|logged|meal|bowl|food)\b/.test(blob) &&
    !SYMPTOM_KEYWORDS.some((keyword) => blob.includes(keyword))
  ) {
    return false;
  }
  return false;
}

/** Issue entries from prior calendar days within the lookback window. */
export function getRecentIssueJournalEntries(
  entries: PetJournalEntry[],
  now: Date = new Date(),
  lookbackDays = 14
): PetJournalEntry[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  return entries
    .filter((entry) => {
      const d = parseEntryDate(entry);
      return d != null && d < today && d >= cutoff;
    })
    .filter(isIssueJournalEntry)
    .sort((a, b) => {
      const da = parseEntryDate(a)?.getTime() ?? 0;
      const db = parseEntryDate(b)?.getTime() ?? 0;
      return db - da;
    });
}

export function shouldOfferAllGoodTodayChip(
  entries: PetJournalEntry[],
  now: Date = new Date()
): boolean {
  return getRecentIssueJournalEntries(entries, now).length > 0;
}

export function buildJournalCheckInTopicReplies(
  entries: PetJournalEntry[],
  now: Date = new Date()
): string[] {
  const chips: string[] = [];
  if (shouldOfferAllGoodTodayChip(entries, now)) {
    chips.push(ALL_GOOD_TODAY_CHIP);
  }
  chips.push(...SYMPTOM_TOPIC_CHIPS, "Not sure");
  return chips;
}

function describeConcern(entry: PetJournalEntry): string {
  const blob = noteBlob(entry);
  if (blob.includes("vomit") || blob.includes("diarr")) return "vomiting or diarrhea";
  if (blob.includes("letharg") || blob.includes("tired")) return "low energy";
  if (blob.includes("appetite") || blob.includes("off food")) return "appetite change";
  if (blob.includes("scratch") || blob.includes("itch")) return "itching";
  if (blob.includes("limp")) return "limping";
  if (blob.includes("cough")) return "coughing";
  if (blob.includes("eye") || blob.includes("ear")) return "eye or ear issue";
  const trimmed = entry.note?.trim();
  if (trimmed) return trimmed.length <= 48 ? trimmed : `${trimmed.slice(0, 45)}…`;
  return "a health concern";
}

function formatRelativeIssueDay(issueDate: Date, now: Date): string {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const day = new Date(issueDate);
  day.setHours(0, 0, 0, 0);
  const delta = Math.round((today.getTime() - day.getTime()) / (24 * 60 * 60 * 1000));
  if (delta === 1) return "yesterday";
  if (delta > 1 && delta < 7) return `${delta} days ago`;
  if (delta >= 7 && delta < 14) return "last week";
  return day.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function buildAllGoodTodayOfflineSummary(
  petName: string,
  issues: PetJournalEntry[],
  now: Date = new Date()
): { answer: string; summary: string; structuredFields: Record<string, string> } {
  if (issues.length === 0) {
    return {
      answer: `Got it — I've noted that ${petName} is doing well today. You can review it in the journal.`,
      summary: `${petName} is doing well today.`,
      structuredFields: {
        STATUS: "Well",
        NOTE: "Doing well today.",
      },
    };
  }

  const sorted = [...issues].sort((a, b) => {
    const da = parseEntryDate(a)?.getTime() ?? 0;
    const db = parseEntryDate(b)?.getTime() ?? 0;
    return da - db;
  });
  const first = sorted[0]!;
  const firstDate = parseEntryDate(first)!;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  firstDate.setHours(0, 0, 0, 0);
  const trackedDays = Math.max(1, Math.round((today.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);
  const priorConcern = describeConcern(issues[0]!);
  const summary = `${petName} is back to normal today. Prior concern: ${priorConcern} (first noted ${formatRelativeIssueDay(firstDate, now)}). Issue tracked for ${trackedDays} day${trackedDays === 1 ? "" : "s"}.`;

  return {
    answer: `Great to hear ${petName} is doing well today. I've saved a recovery note that links back to the recent ${priorConcern} concern.`,
    summary,
    structuredFields: {
      STATUS: "Resolved",
      PRIOR_CONCERN: priorConcern,
      TRACKED_DAYS: String(trackedDays),
      FIRST_NOTED: entryDay(first),
      NOTE: summary,
    },
  };
}

export function buildJournalCheckInPrompt(
  petName: string,
  entries: PetJournalEntry[],
  now: Date = new Date()
): string {
  const issues = getRecentIssueJournalEntries(entries, now);
  if (issues.length === 0) {
    return `What would you like to note about ${petName} today? Pick a topic or describe it in your own words.`;
  }
  return `What would you like to note about ${petName} today? You logged ${describeConcern(issues[0]!)} recently — is ${petName} all good today, or is something else going on?`;
}

export function isAllGoodTodaySelection(text: string): boolean {
  return text.trim().toLowerCase() === ALL_GOOD_TODAY_CHIP.toLowerCase();
}
