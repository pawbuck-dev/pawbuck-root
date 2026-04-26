import type { Tables } from "@/database.types";
import { JOURNAL_HEALTH_SUBTYPES } from "@/constants/petJournal";
import moment from "moment";
import { getOverdueVaccinations } from "@/utils/vaccinationHelpers";

export const MILO_SUGGESTED_QUESTIONS_GENERAL = [
  "What should I bring to a routine vet visit?",
  "How can I help my pet stay calm during loud noises?",
  "What human foods are unsafe for pets?",
  "How do I read a pet food label for basics like protein?",
  "What are signs my pet might need more exercise?",
  "How can I make travel less stressful for my pet?",
] as const;

const LIMPING_RE = /\b(limp|limping|lame|lameness)\b/i;

const SYMPTOM_TOPIC_PATTERNS: { re: RegExp; label: string }[] = [
  { re: LIMPING_RE, label: "limping" },
  { re: /\b(vomit|vomiting|threw up)\b/i, label: "digestive" },
  { re: /\b(cough|coughing)\b/i, label: "cough" },
  { re: /\b(diarrhea|loose stool)\b/i, label: "digestive" },
  { re: /\b(scratch|itch|itching)\b/i, label: "skin" },
  { re: /\b(letharg|tired|weak)\b/i, label: "energy" },
];

function healthSubtypeLabel(subtype: string): string {
  const row = JOURNAL_HEALTH_SUBTYPES.find((s) => s.id === subtype);
  return row?.label ?? subtype.replace(/_/g, " ");
}

/** Journal rows in the last `days` days (by entry_date). */
export function filterJournalEntriesRecent(
  entries: Tables<"pet_journal_entries">[],
  days: number,
  now: Date = new Date()
): Tables<"pet_journal_entries">[] {
  const start = moment(now).startOf("day").subtract(days, "days");
  return entries.filter((e) => {
    const d = moment(e.entry_date).startOf("day");
    return d.isSameOrAfter(start);
  });
}

/** True when recent health-domain journal text mentions limping (for vet-focused starter prompts). */
export function journalRecentMentionsLimping(
  recentEntries: Tables<"pet_journal_entries">[]
): boolean {
  const health = recentEntries.filter((e) => e.domain === "health");
  const blob = health.map((e) => `${e.subtype} ${e.note ?? ""}`).join(" ");
  return LIMPING_RE.test(blob);
}

/** Short topic phrase for generic weekly summarize prompts (non-limping). */
export function deriveJournalPromptTopic(
  recentEntries: Tables<"pet_journal_entries">[]
): string | null {
  const health = recentEntries.filter((e) => e.domain === "health");
  if (health.length === 0) return null;

  const textBlob = health
    .map((e) => `${e.subtype} ${e.note ?? ""}`)
    .join(" ")
    .toLowerCase();

  for (const { re, label } of SYMPTOM_TOPIC_PATTERNS) {
    if (re.test(textBlob)) {
      return label;
    }
  }

  const symptomRow = health.find((e) => e.subtype === "symptom");
  if (symptomRow) {
    return healthSubtypeLabel(symptomRow.subtype).toLowerCase();
  }

  return "health journal";
}

export type MiloSuggestedPromptsInput = {
  petName: string | null | undefined;
  vaccinations: Tables<"vaccinations">[];
  journalEntries: Tables<"pet_journal_entries">[];
  /** Max chips to return (default 6). */
  maxCount?: number;
  now?: Date;
};

/**
 * Builds contextual Milo starter prompts from vaccines + health journal,
 * then general wellness lines.
 */
export function buildMiloSuggestedPrompts(input: MiloSuggestedPromptsInput): string[] {
  const max = Math.min(12, Math.max(1, input.maxCount ?? 6));
  const name = input.petName?.trim() || null;
  const now = input.now ?? new Date();
  const out: string[] = [];
  const push = (q: string) => {
    if (out.length >= max) return;
    if (!out.includes(q)) out.push(q);
  };

  const recent = filterJournalEntriesRecent(input.journalEntries, 7, now);
  const limping = journalRecentMentionsLimping(recent);

  if (name && limping) {
    push(`Summarize ${name}'s recent limping for the vet.`);
  }

  const overdue = getOverdueVaccinations(input.vaccinations).sort((a, b) => {
    const da = a.next_due_date ? moment(a.next_due_date).valueOf() : 0;
    const db = b.next_due_date ? moment(b.next_due_date).valueOf() : 0;
    return da - db;
  });
  if (name && overdue.length > 0) {
    push(`List ${name}'s overdue vaccines.`);
  }

  const topic = deriveJournalPromptTopic(recent);
  if (!limping && name && topic) {
    push(`Summarize the ${topic} reports from this week for ${name}.`);
  } else if (!limping && topic) {
    push(`Summarize the ${topic} reports from this week.`);
  }

  if (name) {
    push(`Give me everyday wellness tips for ${name}.`);
  }

  for (const g of MILO_SUGGESTED_QUESTIONS_GENERAL) {
    push(g);
    if (out.length >= max) break;
  }

  return out.slice(0, max);
}
