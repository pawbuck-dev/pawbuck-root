import type { Pet } from "@/context/petsContext";
import type { PetLogSeverity } from "@/types/petLog";
import type {
  VetMedicalContext,
  VetNotificationObservation,
  VetNotificationPayload,
  VetOwnerContact,
} from "@/types/vetNotification";
import { sanitizeCareTeamMemberDisplayName } from "@/utils/userDisplayIdentity";
import { formatPetInboundEmail } from "@/utils/petEmail";

export type VetCareTeamRow = {
  vet_name: string;
  clinic_name: string;
  type: string | null;
};

export type BuildVetJournalMessageInput = {
  pet: Pet;
  /** Owner-typed lines from the Milo journal session (chronological). */
  userTurns: readonly string[];
  /** API structured summary when the journal session completed (may contain Markdown). */
  journalSummary?: string | null;
  /** Pet owner’s name for sign-off (full name when available). */
  ownerSigningName: string;
  /** Human-readable session date for footer copy, e.g. May 10, 2026 */
  sessionDateLabel: string;
  /** ISO-8601 timestamp for LOGGED line when available */
  logIsoTimestamp?: string | null;
  /** Short timezone label, e.g. PT */
  timezoneAbbrev?: string | null;
  /** Client triage severity from journal row when structured triage is absent */
  severity?: PetLogSeverity | null;
  /** Optional structured payload from journal Gemini (§4). */
  vetNotificationPayload?: VetNotificationPayload | null;
  /** Optional medical context from API (record-backed). */
  vetMedicalContext?: VetMedicalContext | null;
  /** Owner phone/email from auth profile when available */
  vetOwnerContact?: VetOwnerContact | null;
  /** Deep link segment; defaults to pet id */
  journalRecordId?: string | null;
};

const SUBJECT_MAX = 70;
const URGENCY_RATIONALE_MAX = 80;
const ONE_LINE_MAX_WORDS = 25;

/** When true, do not open email compose — show call-first UI (spec §3.3 / §5.1). */
export function shouldSuppressVetEmailCompose(
  payload: VetNotificationPayload | null | undefined,
  severity: PetLogSeverity | null | undefined
): boolean {
  if (payload?.triage?.level === "emergency") return true;
  if (severity === "urgent") return true;
  return false;
}

/**
 * Strips common Markdown used in journal summaries (**bold**, bullets) for clinic plain-text email.
 */
export function stripMarkdownForVetEmail(raw: string): string {
  let s = raw.replace(/\r\n/g, "\n");
  // **Label:** or **text**
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/\*([^*]+)\*/g, "$1");
  s = s.replace(/^#{1,6}\s+/gm, "");
  s = s.replace(/^[-*]\s+/gm, "• ");
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

const normType = (t: string | null | undefined) => (t ?? "").toLowerCase().trim();

export function pickPrimaryVetGreetingName(members: readonly VetCareTeamRow[]): string | null {
  if (!members.length) return null;
  const veterinarians = members.filter((m) => normType(m.type) === "veterinarian");
  const pool = veterinarians.length > 0 ? veterinarians : members;
  for (const m of pool) {
    const label = sanitizeCareTeamMemberDisplayName(m.vet_name, m.clinic_name, "").trim();
    if (label) return label;
  }
  return null;
}

function trimLines(lines: readonly string[]): string[] {
  return lines.map((s) => s.trim()).filter(Boolean);
}

/** Compact age for subject line, e.g. 4yr, 6mo */
function formatAgeCompactFromDob(dateOfBirth: string | null | undefined): string {
  if (!dateOfBirth?.trim()) return "age unknown";
  const dob = new Date(`${dateOfBirth.trim()}T12:00:00Z`);
  if (Number.isNaN(dob.getTime())) return "age unknown";
  const now = new Date();
  let years = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) years--;
  if (years <= 0) {
    const months = Math.max(
      0,
      (now.getUTCFullYear() - dob.getUTCFullYear()) * 12 + now.getUTCMonth() - dob.getUTCMonth()
    );
    return months <= 1 ? "1mo" : `${months}mo`;
  }
  return years === 1 ? "1yr" : `${years}yr`;
}

/** Body/header PET line, e.g. "4 yr" */
function formatAgeBodyFromDob(dateOfBirth: string | null | undefined): string {
  const c = formatAgeCompactFromDob(dateOfBirth);
  if (c === "age unknown") return c;
  return c.replace(/yr$/, " yr").replace(/mo$/, " mo");
}

function formatSexAbbrev(pet: Pet): string {
  const s = (pet.sex ?? "").trim();
  if (!s) return "sex unknown";
  const lower = s.toLowerCase();
  if (lower.startsWith("m")) return "M";
  if (lower.startsWith("f")) return "F";
  return s.length <= 6 ? s : `${s.slice(0, 6)}…`;
}

function formatWeightLine(pet: Pet): string {
  if (pet.weight_value == null || Number.isNaN(Number(pet.weight_value))) return "weight unknown";
  const u = (pet.weight_unit ?? "").trim() || "kg";
  return `${Number(pet.weight_value)} ${u}`;
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
}

function truncateChars(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  if (maxChars <= 1) return "…";
  return `${t.slice(0, maxChars - 1)}…`;
}

function buildOneLineClinicalSummary(petName: string, userTurns: string[], journalPlain: string): string {
  const lines = trimLines(userTurns);
  const base = lines.length > 0 ? lines.join(" ") : journalPlain.replace(/\s+/g, " ").trim();
  const core = base || journalPlain.replace(/\s+/g, " ").trim() || "Owner logged a health journal session.";
  const withPet = core.toLowerCase().startsWith(petName.toLowerCase()) ? core : `${petName}: ${core}`;
  return truncateWords(withPet, ONE_LINE_MAX_WORDS);
}

function subjectUrgencyTag(
  triage: VetNotificationPayload["triage"] | undefined,
  severity: PetLogSeverity | null | undefined
): string {
  const level = triage?.level;
  if (level === "emergency") return "Sameday callback requested";
  if (level === "fyi") return "FYI";
  if (level === "soon") return "Please advise within 24h";
  if (level === "advice") return "Advice requested";
  switch (severity) {
    case "urgent":
      return "Sameday callback requested";
    case "high":
      return "Please advise within 24h";
    case "medium":
      return "Advice requested";
    default:
      return "FYI";
  }
}

function bodyUrgencyLine(
  triage: VetNotificationPayload["triage"] | undefined,
  severity: PetLogSeverity | null | undefined
): string {
  const rationaleRaw = triage?.rationale?.trim();
  const rationale = rationaleRaw
    ? truncateChars(rationaleRaw, URGENCY_RATIONALE_MAX)
    : "";
  const level = triage?.level;
  if (level === "emergency") {
    return `Emergency — ${rationale || "Owner directed to call; email suppressed per protocol."}`;
  }
  if (level === "fyi") return rationale ? `FYI — ${rationale}` : "FYI — routine owner update.";
  if (level === "soon") return rationale ? `Soon — ${rationale}` : "Soon — please advise within 24h.";
  if (level === "advice") return rationale ? `Advice requested — ${rationale}` : "Advice requested — owner seeks guidance.";
  if (severity === "urgent") return rationale ? `Sameday callback requested — ${rationale}` : "Sameday callback requested — acute concern reported.";
  if (severity === "high") return rationale ? `Please advise within 24h — ${rationale}` : "Please advise within 24h — elevated concern reported.";
  if (severity === "medium") return rationale ? `Advice requested — ${rationale}` : "Advice requested.";
  return rationale ? `FYI — ${rationale}` : "FYI — owner update.";
}

function observationWhat(obs: VetNotificationObservation): string {
  const text = obs.userText?.trim();
  if (text) return text;
  return obs.displayLabel?.trim() || obs.primaryChip?.trim() || "Observation";
}

function formatObservationBlock(index: number, obs: VetNotificationObservation): string {
  const label = obs.displayLabel?.trim() || `Observation ${index}`;
  const lines: string[] = [`${index}. ${label}`, `   What:       ${observationWhat(obs)}`];
  if (obs.onset?.trim()) lines.push(`   Onset:      ${obs.onset.trim()}`);
  if (obs.frequency?.trim()) lines.push(`   Frequency:  ${obs.frequency.trim()}`);
  if (obs.severity?.trim()) lines.push(`   Severity:   ${obs.severity.trim()}`);
  if (obs.trend?.trim()) lines.push(`   Trend:      ${obs.trend.trim()}`);
  if (obs.onsetContext?.trim()) lines.push(`   Context:    ${obs.onsetContext.trim()}`);
  return lines.join("\n");
}

function formatMedicalBlock(ctx: VetMedicalContext): string[] {
  const lines: string[] = [];
  if (ctx.lastVisitDate?.trim() || ctx.lastVisitLabel?.trim()) {
    const p = [ctx.lastVisitDate?.trim(), ctx.lastVisitLabel?.trim()].filter(Boolean).join(" · ");
    if (p) lines.push(`LAST VISIT     ${p}`);
  }
  if (ctx.vaccinesStatus?.trim() || ctx.vaccinesDetail?.trim()) {
    const v = [ctx.vaccinesStatus?.trim(), ctx.vaccinesDetail?.trim()].filter(Boolean).join(" — ");
    if (v) lines.push(`VACCINES       ${v}`);
  }
  if (ctx.medicationsLine?.trim()) lines.push(`MEDICATIONS    ${ctx.medicationsLine.trim()}`);
  if (ctx.allergiesLine?.trim()) lines.push(`ALLERGIES      ${ctx.allergiesLine.trim()}`);
  if (ctx.insuranceLine?.trim()) lines.push(`INSURANCE      ${ctx.insuranceLine.trim()}`);
  if (ctx.weightTrendSummary?.trim()) lines.push(`WEIGHT TREND   ${ctx.weightTrendSummary.trim()}`);
  return lines;
}

function formatLoggedLine(input: BuildVetJournalMessageInput): string {
  if (input.logIsoTimestamp) {
    try {
      const d = new Date(input.logIsoTimestamp);
      if (!Number.isNaN(d.getTime())) {
        const tz = input.timezoneAbbrev?.trim() || "";
        const datePart = d.toLocaleDateString("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });
        const timePart = d.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        const tzSuffix = tz ? ` ${tz}` : "";
        return `${datePart}, ${timePart}${tzSuffix}`;
      }
    } catch {
      /* fall through */
    }
  }
  return input.sessionDateLabel;
}

/**
 * Subject per spec §2.1 (70 chars max; truncate summary segment first).
 */
export function buildVetMessageSubject(input: BuildVetJournalMessageInput): string {
  const pet = input.pet;
  const breed = (pet.breed ?? "").trim() || (pet.animal_type ?? "").trim() || "mixed";
  const age = formatAgeCompactFromDob(pet.date_of_birth);
  const sex = formatSexAbbrev(pet);
  const headCompact = `${pet.name} (${breed}, ${age} ${sex})`;
  const tag = subjectUrgencyTag(input.vetNotificationPayload?.triage, input.severity ?? null);
  const journalPlain = stripMarkdownForVetEmail(input.journalSummary?.trim() ?? "");
  const oneLine = buildOneLineClinicalSummary(pet.name, trimLines(input.userTurns), journalPlain);
  const sep = " · ";
  const budget = SUBJECT_MAX - headCompact.length - sep.length - tag.length - sep.length;
  const summarySeg = budget > 8 ? truncateChars(oneLine, budget) : truncateChars(oneLine, 12);
  let subject = `${headCompact}${sep}${summarySeg}${sep}${tag}`;
  if (subject.length > SUBJECT_MAX) {
    const over = subject.length - SUBJECT_MAX;
    const newSummary = truncateChars(summarySeg, Math.max(4, summarySeg.length - over - 1));
    subject = `${headCompact}${sep}${newSummary}${sep}${tag}`;
  }
  if (subject.length > SUBJECT_MAX) subject = truncateChars(subject, SUBJECT_MAX);
  return subject;
}

/**
 * Plain-text vet email body per Vet Notification Format v1 (header, observations, footer, owner sign-off).
 */
export function buildVetMessageFromJournalSession(input: BuildVetJournalMessageInput): string {
  const pet = input.pet;
  const breed = (pet.breed ?? "").trim() || (pet.animal_type ?? "").trim() || "unknown";
  const age = formatAgeBodyFromDob(pet.date_of_birth);
  const sexNeuter = formatSexAbbrev(pet);
  const weight = formatWeightLine(pet);
  const petEmail = formatPetInboundEmail(pet.email_id, pet.name);
  const chip = pet.microchip_number?.trim() ? pet.microchip_number.trim() : "Not registered";

  const owner = input.ownerSigningName.trim() || "Pet parent";
  const phone = input.vetOwnerContact?.phone?.trim() || "not provided";
  const email = input.vetOwnerContact?.email?.trim() || "not provided";
  const preferred =
    input.vetOwnerContact?.preferredContactLine?.trim() || "Email reply";

  const logged = formatLoggedLine(input);
  const urgencyLine = bodyUrgencyLine(input.vetNotificationPayload?.triage, input.severity ?? null);

  const journalPlain = stripMarkdownForVetEmail(input.journalSummary?.trim() ?? "");
  const user = trimLines(input.userTurns);
  const oneLine = buildOneLineClinicalSummary(pet.name, user, journalPlain);

  const obsPayload = input.vetNotificationPayload?.observations?.filter(
    (o) => observationWhat(o).length > 0
  );
  let obsBlock = "";
  if (obsPayload && obsPayload.length > 0) {
    obsBlock = obsPayload.map((o, i) => formatObservationBlock(i + 1, o)).join("\n\n");
  } else if (user.length > 0) {
    obsBlock = user.map((line, i) => formatObservationBlock(i + 1, { userText: line, displayLabel: "Owner-reported" })).join("\n\n");
  } else if (journalPlain) {
    obsBlock = formatObservationBlock(1, {
      displayLabel: "Session summary",
      userText: journalPlain.replace(/\n+/g, " ").trim(),
    });
  } else {
    obsBlock = formatObservationBlock(1, {
      displayLabel: "Owner-reported",
      userText: "No typed lines captured; see PawBuck journal for this session.",
    });
  }

  const neg = input.vetNotificationPayload?.negativeFindings?.filter((s) => s.trim());
  const negLine =
    neg && neg.length > 0
      ? `Owner reports normal: ${neg.map((s) => s.trim()).join(", ")}.`
      : "";

  const medLines = input.vetMedicalContext ? formatMedicalBlock(input.vetMedicalContext) : [];

  const defaultAsk = `Should ${pet.name} be examined in person, or is home monitoring with criteria for an urgent visit appropriate?`;
  const ask =
    input.vetNotificationPayload?.askLine?.trim() ||
    defaultAsk;

  const recordId = (input.journalRecordId ?? pet.id).trim();
  const footerDate = input.sessionDateLabel;

  const parts = [
    `PET        ${pet.name} · ${breed} · ${age} · ${sexNeuter} · ${weight}`,
    `PET ID     ${petEmail}  ·  Microchip: ${chip}`,
    `OWNER      ${owner} · ${phone} · ${email}`,
    `PREFERRED  ${preferred}`,
    `LOGGED     ${logged}  ·  via PawBuck mobile app`,
    `URGENCY    ${urgencyLine}`,
    "",
    oneLine,
    "",
    "OBSERVATIONS",
    obsBlock,
    "",
  ];
  if (negLine) {
    parts.push(negLine, "");
  }
  if (medLines.length > 0) {
    parts.push("MEDICAL CONTEXT", medLines.join("\n"), "");
  }
  parts.push(
    ask,
    "",
    `Reply directly to this email — your response routes to ${pet.name}'s record.`,
    `View full journal: https://pawbuck.com/r/${encodeURIComponent(recordId)}`,
    `Sent on behalf of ${owner} via PawBuck. This message was generated from observations the owner logged on ${footerDate}. It is not a diagnosis. PawBuck does not provide medical advice.`,
    "",
    `${owner}`,
    `${pet.name}'s parent · sent via PawBuck`
  );

  return parts.join("\n");
}
