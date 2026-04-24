import type { JournalDomain } from "@/constants/petJournal";
import type { PetLogEntry, PetLogSeverity } from "@/types/petLog";

const URGENT = [
  "seizure",
  "seizing",
  "bleeding",
  "blood",
  "collapsed",
  "collapse",
  "unconscious",
  "not breathing",
  "choking",
  "poison",
  "poisoned",
  "toxic",
  "bloat",
  "gdv",
  "hit by car",
  "trauma",
  "heat stroke",
  "heatstroke",
  "can't stand",
  "cannot stand",
  "labored breathing",
  "gasping",
  "blue gums",
];

const HIGH = [
  "vomit",
  "vomiting",
  "threw up",
  "throwing up",
  "diarrhea",
  "diarrhoea",
  "won't eat",
  "not eating",
  "hasn't eaten",
  "hasnt eaten",
  "24h",
  "24 hours",
  "lethargic",
  "won't drink",
  "bloody stool",
  "blood in",
  "retching",
  "dry heave",
];

const MEDIUM = [
  "scratching",
  "scratch",
  "limp",
  "limping",
  "skipped meal",
  "eating less",
  "sneeze",
  "cough",
  "lump",
  "hair loss",
  "ear",
  "itch",
];

const LOW = [
  "played well",
  "ate normally",
  "eating well",
  "good appetite",
  "normal stool",
  "happy",
  "energetic",
  "great mood",
  "slept well",
];

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function containsAny(haystack: string, needles: readonly string[]): boolean {
  const h = normalize(haystack);
  return needles.some((n) => h.includes(n));
}

/** Bump severity by one step (e.g. allergy match). */
const SEVERITY_ORDER: PetLogSeverity[] = ["low", "medium", "high", "urgent"];

export function bumpSeverity(s: PetLogSeverity): PetLogSeverity {
  const i = SEVERITY_ORDER.indexOf(s);
  return i >= 0 && i < SEVERITY_ORDER.length - 1 ? SEVERITY_ORDER[i + 1]! : s;
}

export function maxSeverity(a: PetLogSeverity, b: PetLogSeverity): PetLogSeverity {
  return SEVERITY_ORDER.indexOf(a) >= SEVERITY_ORDER.indexOf(b) ? a : b;
}

/** Worst-case severity across user turns (journal threads). */
export function severityFromConversationText(
  userTexts: readonly string[],
  ctx?: TriageContext
): PetLogSeverity {
  let acc: PetLogSeverity = "low";
  for (const t of userTexts) {
    acc = maxSeverity(acc, mapSeverity(t, ctx));
  }
  return acc;
}

export type TriageContext = {
  allergies?: readonly string[];
  conditions?: readonly string[];
};

/**
 * Keyword-based severity. Not medical advice — UI assist only.
 */
export function mapSeverity(text: string, ctx?: TriageContext): PetLogSeverity {
  let level: PetLogSeverity = "medium";

  if (containsAny(text, URGENT)) level = "urgent";
  else if (containsAny(text, HIGH)) level = "high";
  else if (containsAny(text, MEDIUM)) level = "medium";
  else if (containsAny(text, LOW)) level = "low";
  else level = "medium";

  const allergyLabels = (ctx?.allergies ?? []).map((a) => normalize(a)).filter(Boolean);
  const conditionLabels = (ctx?.conditions ?? []).map((c) => normalize(c)).filter(Boolean);
  const h = normalize(text);
  for (const label of [...allergyLabels, ...conditionLabels]) {
    if (label.length >= 3 && h.includes(label)) {
      level = bumpSeverity(level);
      break;
    }
  }

  return level;
}

function inferDomain(text: string, tabHint: JournalDomain): JournalDomain {
  const h = normalize(text);
  if (tabHint !== "health") return tabHint;
  if (
    h.includes("bark") ||
    h.includes("anxious") ||
    h.includes("aggressive") ||
    h.includes("calm") ||
    h.includes("hyper")
  )
    return "behavioral";
  if (
    h.includes("travel") ||
    h.includes("new home") ||
    h.includes("weather") ||
    h.includes("yard") ||
    h.includes("outside")
  )
    return "environmental";
  return "health";
}

function inferSubtype(domain: JournalDomain, text: string): string {
  const h = normalize(text);
  if (domain === "health") {
    if (h.includes("vomit") || h.includes("diarr") || h.includes("ate")) return "symptom";
    if (h.includes("food") || h.includes("eat")) return "diet";
    if (h.includes("mood") || h.includes("happy") || h.includes("sad")) return "mood";
    if (h.includes("sleep")) return "sleep";
    return "symptom";
  }
  if (domain === "behavioral") {
    if (h.includes("bark")) return "hyperactive";
    if (h.includes("anxious") || h.includes("stress")) return "anxious";
    return "other";
  }
  return "other";
}

function extractTags(text: string): string[] {
  const tags: string[] = [];
  const h = normalize(text);
  if (h.includes("food") || h.includes("eat")) tags.push("diet");
  if (h.includes("vomit")) tags.push("gi");
  if (h.includes("limb") || h.includes("limp")) tags.push("mobility");
  return tags;
}

/** True if persisted journal note is labeled for triage (Milo clinical summary prefix). */
export function noteHasClinicalTriagePrefix(note: string): boolean {
  const t = note.trim();
  const head = t.slice(0, 32).toUpperCase();
  return head.startsWith("[URGENT]") || head.startsWith("[CRITICAL]");
}

/**
 * @param note Text stored in the journal (e.g. API `journalSummary`, or raw user lines as fallback).
 * @param triageSourceText Optional. When set, severity/domain/subtype/tags are derived from this (typically owner chat lines), not from `note`.
 */
export function extractPetLogEntry(
  note: string,
  petId: string,
  userId: string,
  tabDomain: JournalDomain,
  ctx?: TriageContext,
  triageSourceText?: string
): PetLogEntry {
  const triage = (triageSourceText ?? note).trim();
  const displayNote = note.trim();
  const severity = mapSeverity(triage, ctx);
  const domain = inferDomain(triage, tabDomain);
  const subtype = inferSubtype(domain, triage);
  const vet_flag =
    severity === "high" ||
    severity === "urgent" ||
    noteHasClinicalTriagePrefix(displayNote);

  return {
    id: `milo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    pet_id: petId,
    user_id: userId,
    note: displayNote,
    created_at: new Date().toISOString(),
    severity,
    domain,
    subtype,
    tags: extractTags(triage),
    vet_flag,
    source: "milo",
  };
}

export function assistantReplyForSeverity(
  severity: PetLogSeverity,
  petName: string
): string {
  const disclaimer =
    "This is general information, not a diagnosis. When in doubt, contact your veterinarian.";

  switch (severity) {
    case "low":
      return `Thanks for logging how ${petName} is doing. Sounds routine. ${disclaimer} 🐕`;
    case "medium":
      return `I've noted that about ${petName}. Keep an eye on appetite, energy, and whether symptoms change. If anything worsens or new signs appear, contact your vet. ${disclaimer}`;
    case "high":
      return `${petName}'s symptoms could use a professional opinion soon. Consider messaging your vet with the details below or booking a visit. ${disclaimer}`;
    case "urgent":
      return `If ${petName} may be in distress or you see emergency signs, seek immediate veterinary or emergency care. You can also call your nearest emergency clinic. ${disclaimer}`;
    default:
      return disclaimer;
  }
}
