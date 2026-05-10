/**
 * Copy and light hints for Milo chat after a pet document upload + vision classify.
 */

export type PetRef = { id: string; name: string };

export type VaultRowLike = {
  documentType: string;
  extractedJson: string;
};

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

export function buildDocumentUploadThreadContent(
  row: VaultRowLike,
  selectedPet: PetRef,
  allPets: PetRef[]
): { userContent: string; assistantContent: string } {
  const section = vaultRowDocumentSectionLabel(row.documentType);
  const userContent = `Uploaded a health document (${section})`;

  let assistantContent =
    row.documentType.toLowerCase() === "irrelevant"
      ? `I saved the file for ${selectedPet.name}. I could not confidently match it to a specific health category yet — you can still find it in their documents list.`
      : `I've filed this under ${section} for ${selectedPet.name}, based on what Milo read in the file.`;

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
