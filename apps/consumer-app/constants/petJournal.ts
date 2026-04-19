export type JournalDomain = "health" | "behavioral" | "environmental";

export const JOURNAL_DOMAIN_LABEL: Record<JournalDomain, string> = {
  health: "Health",
  behavioral: "Behavior",
  environmental: "Environment",
};

/** Health subtypes — symptoms, diet, mood, sleep, free-text other */
export const JOURNAL_HEALTH_SUBTYPES = [
  { id: "symptom", label: "Symptom" },
  { id: "diet", label: "Diet" },
  { id: "mood", label: "Mood" },
  { id: "sleep", label: "Sleep" },
  { id: "elimination", label: "Elimination (stool & urine)" },
  { id: "other", label: "Other" },
] as const;

export const JOURNAL_BEHAVIORAL_SUBTYPES = [
  { id: "hyperactive", label: "Hyperactive" },
  { id: "anxious", label: "Anxious" },
  { id: "calm", label: "Calm" },
  { id: "aggressive", label: "Aggressive" },
  { id: "withdrawn", label: "Withdrawn" },
  { id: "clingy", label: "Clingy" },
  { id: "other", label: "Other" },
] as const;

export const JOURNAL_ENVIRONMENTAL_SUBTYPES = [
  { id: "new_home", label: "New home" },
  { id: "new_family_member", label: "New family member" },
  { id: "travel", label: "Travel" },
  { id: "seasonal", label: "Seasonal" },
  { id: "routine_change", label: "Routine change" },
  { id: "other", label: "Other" },
] as const;

export function subtypesForDomain(domain: JournalDomain) {
  switch (domain) {
    case "health":
      return JOURNAL_HEALTH_SUBTYPES;
    case "behavioral":
      return JOURNAL_BEHAVIORAL_SUBTYPES;
    case "environmental":
      return JOURNAL_ENVIRONMENTAL_SUBTYPES;
    default:
      return JOURNAL_HEALTH_SUBTYPES;
  }
}

export function subtypeLabel(
  domain: JournalDomain,
  subtypeId: string
): string {
  const list = subtypesForDomain(domain) as readonly { id: string; label: string }[];
  return list.find((s) => s.id === subtypeId)?.label ?? subtypeId;
}
