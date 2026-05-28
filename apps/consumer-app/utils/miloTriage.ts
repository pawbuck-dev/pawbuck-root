import type { JournalDomain } from "@/constants/petJournal";
import type { PetLogEntry, PetLogSeverity } from "@/types/petLog";
import {
  isDietLogText,
  isHydrationLogText,
  isRoutineJournalLogText,
} from "@/utils/miloJournalIntent";
import { computeMiloJournalIdempotencyKey } from "@/utils/miloJournalIdempotency";

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
  "24 hours without water",
  "no water for 24",
  "hasn't drunk",
  "hasnt drunk",
  "hasn't had water",
  "not had water",
  "no water intake",
  "lethargic",
  "won't drink",
  "not drinking",
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
  if (isRoutineJournalLogText(text)) return "low";

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
    if (h.includes("vomit") || h.includes("diarr")) return "symptom";
    if (isHydrationLogText(text)) return "other";
    if (isDietLogText(text) || h.includes("food") || h.includes("meal") || h.includes("bowl")) return "diet";
    if (h.includes("mood") || h.includes("happy") || h.includes("sad")) return "mood";
    if (h.includes("sleep")) return "sleep";
    if (/\beat(ing)?\b/.test(h) || /\beat\b/.test(h)) return "symptom";
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

const SEVERE_SUMMARY_NOTE =
  "Note: Severe symptoms detected. Veterinary consultation recommended.";

/** True if persisted journal note is labeled for triage (legacy prefixes or current severe-summary line). */
export function noteHasClinicalTriagePrefix(note: string): boolean {
  const t = note.trim();
  const head = t.slice(0, 32).toUpperCase();
  if (head.startsWith("[URGENT]") || head.startsWith("[CRITICAL]")) return true;
  return t.includes(SEVERE_SUMMARY_NOTE);
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

  const milo_idempotency_key = computeMiloJournalIdempotencyKey({
    petId,
    domain,
    subtype,
    triageSourceText: triage,
  });

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
    milo_idempotency_key,
  };
}

export function assistantReplyForSeverity(
  severity: PetLogSeverity,
  petName: string
): string {
  switch (severity) {
    case "low":
      return `Entry logged for ${petName}.`;
    case "medium":
      return `Noted for ${petName}. Continue monitoring appetite, energy, and elimination.`;
    case "high":
      return `${SEVERE_SUMMARY_NOTE} (${petName})`;
    case "urgent":
      return `If ${petName} may be in distress or you see emergency signs, seek immediate veterinary or emergency care now. ${SEVERE_SUMMARY_NOTE}`;
    default:
      return `Entry logged for ${petName}.`;
  }
}
