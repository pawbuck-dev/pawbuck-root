/**
 * Copy and light hints for Milo chat after a pet document upload + vision classify.
 */

import {
  formatClinicalSyncMessage,
  parseMedicalRecordExtraction,
  type MedicalRecordItem,
  type PetDocumentClinicalSyncResult,
} from "@/utils/medicalRecordExtraction";

export type PetRef = { id: string; name: string };

export type VaultRowLike = {
  documentType: string;
  extractedJson: string;
  clinicalSync?: PetDocumentClinicalSyncResult | null;
};

const MAX_SUMMARY_ITEMS = 8;

export function vaultRowDocumentSectionLabel(documentType: string): string {
  const t = (documentType ?? "").trim().toLowerCase();
  const map: Record<string, string> = {
    medications: "Medications",
    lab_results: "Lab results",
    clinical_exams: "Clinical exams",
    vaccinations: "Vaccines",
    billing_invoice: "Billing",
    travel_certificate: "Travel",
    insurance_policy: "Insurance",
    pedigree: "Pedigree",
    identity_document: "ID & registration",
    irrelevant: "Documents",
  };
  return map[t] ?? "Health records";
}

function normalizePetNameForMatch(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\s]/gi, "");
}

export function tryExtractPetNameFromExtractedJson(extractedJson: string): string | null {
  const raw = (extractedJson ?? "").trim();
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const candidates = [j.pet_name, j.petName, j.name, j.patient_name, j.patientName];
    for (const c of candidates) {
      if (typeof c === "string" && c.trim()) return c.trim();
    }
  } catch {
    /* non-JSON or unexpected shape */
  }
  return null;
}

export function formatIsoDateShort(iso: string): string {
  const trimmed = iso.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!m) return trimmed;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return trimmed;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

type FlexibleExtraction = {
  title?: string;
  summary?: string;
  primaryDate?: string | null;
  keyFacts?: { label: string; value: string }[];
};

function parseFlexibleExtraction(extractedJson: string): FlexibleExtraction | null {
  const raw = (extractedJson ?? "").trim();
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const keyFactsRaw = o.keyFacts;
    const keyFacts = Array.isArray(keyFactsRaw)
      ? keyFactsRaw
          .map((x) => {
            if (!x || typeof x !== "object") return null;
            const r = x as Record<string, unknown>;
            const label = typeof r.label === "string" ? r.label.trim() : "";
            const value = typeof r.value === "string" ? r.value.trim() : "";
            if (!label && !value) return null;
            return { label: label || "Detail", value };
          })
          .filter((x): x is { label: string; value: string } => x != null)
      : [];

    const title = typeof o.title === "string" ? o.title.trim() : undefined;
    const summary = typeof o.summary === "string" ? o.summary.trim() : undefined;
    const primaryDate =
      typeof o.primaryDate === "string" && o.primaryDate.trim() ? o.primaryDate.trim() : null;

    if (!title && !summary && keyFacts.length === 0 && !primaryDate) return null;

    return { title, summary, primaryDate, keyFacts };
  } catch {
    return null;
  }
}

function formatMedicalItemLine(item: MedicalRecordItem): string {
  const parts: string[] = [];
  if (item.administeredDate?.trim()) {
    parts.push(`given ${formatIsoDateShort(item.administeredDate)}`);
  }
  if (item.expiryDate?.trim()) {
    parts.push(`next due ${formatIsoDateShort(item.expiryDate)}`);
  }
  const detail = parts.length > 0 ? ` — ${parts.join(" · ")}` : "";
  return `• ${item.name}${detail}`;
}

function buildMedicalItemsSummary(extraction: ReturnType<typeof parseMedicalRecordExtraction>): string | null {
  const items = extraction?.items ?? [];
  if (items.length === 0) return null;

  const lines: string[] = ["Here's what I found in your document:"];
  const visible = items.slice(0, MAX_SUMMARY_ITEMS);
  for (const item of visible) {
    lines.push(formatMedicalItemLine(item));
  }
  const remaining = items.length - visible.length;
  if (remaining > 0) {
    lines.push(`• …and ${remaining} more item${remaining === 1 ? "" : "s"} on the document`);
  }

  const clinic = extraction?.clinicName?.trim();
  const visit = extraction?.dateOfVisit?.trim();
  if (clinic && visit) {
    lines.push(`\nVisit at ${clinic} on ${formatIsoDateShort(visit)}.`);
  } else if (clinic) {
    lines.push(`\nClinic: ${clinic}.`);
  } else if (visit) {
    lines.push(`\nDate on document: ${formatIsoDateShort(visit)}.`);
  }

  return lines.join("\n");
}

function buildFlexibleSummary(flexible: FlexibleExtraction): string | null {
  const lines: string[] = ["Here's what I found in your document:"];
  if (flexible.title) lines.push(flexible.title);
  if (flexible.summary) lines.push(flexible.summary);
  for (const fact of (flexible.keyFacts ?? []).slice(0, 6)) {
    lines.push(`• ${fact.label}: ${fact.value}`);
  }
  if (flexible.primaryDate) {
    lines.push(`• Date: ${formatIsoDateShort(flexible.primaryDate)}`);
  }
  return lines.length > 1 ? lines.join("\n") : null;
}

/** User-facing OCR summary for Milo chat after document upload. */
export function summarizeExtractedJsonForChat(extractedJson: string): string | null {
  const medical = parseMedicalRecordExtraction(extractedJson);
  const medicalSummary =
    medical && (medical.items?.length ?? 0) > 0 ? buildMedicalItemsSummary(medical) : null;
  if (medicalSummary) return medicalSummary;

  const flexible = parseFlexibleExtraction(extractedJson);
  if (flexible) return buildFlexibleSummary(flexible);

  return null;
}

function buildDocumentUploadClosing(
  section: string,
  petName: string,
  documentType: string,
  clinicalSync?: PetDocumentClinicalSyncResult | null
): string {
  const syncMsg = formatClinicalSyncMessage(clinicalSync);
  if (syncMsg) {
    return `${syncMsg}\n\nEverything is saved under ${section} for ${petName}.`;
  }
  if (documentType.toLowerCase() === "irrelevant") {
    return `I saved the file for ${petName}. I could not confidently match it to a specific health category yet — you can still find it in their documents list.`;
  }
  return `I've filed this under ${section} for ${petName}, based on what Milo read in the file.`;
}

export function buildDocumentUploadThreadContent(
  row: VaultRowLike,
  selectedPet: PetRef,
  allPets: PetRef[]
): { userContent: string; assistantContent: string } {
  const section = vaultRowDocumentSectionLabel(row.documentType);
  const userContent = `Uploaded a health document (${section})`;

  const summary = summarizeExtractedJsonForChat(row.extractedJson);
  const closing = buildDocumentUploadClosing(
    section,
    selectedPet.name,
    row.documentType,
    row.clinicalSync
  );

  let assistantContent = summary ? `${summary}\n\n${closing}` : closing;

  const extractedName = tryExtractPetNameFromExtractedJson(row.extractedJson);
  if (extractedName && allPets.length > 1) {
    const docNorm = normalizePetNameForMatch(extractedName);
    const selNorm = normalizePetNameForMatch(selectedPet.name);
    if (docNorm && docNorm !== selNorm) {
      const matched = allPets.find((p) => normalizePetNameForMatch(p.name) === docNorm);
      if (matched && matched.id !== selectedPet.id) {
        assistantContent += `\n\nThe document mentions "${extractedName}", which looks more like ${matched.name}. If this file was meant for them, use the menu (⋮) → Select pet, switch to ${matched.name}, then tap + again to attach.`;
      }
    }
  }

  return { userContent, assistantContent };
}
