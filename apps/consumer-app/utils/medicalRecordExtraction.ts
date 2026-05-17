import type { VaccinationInsert } from "@/types/vaccination";

export type MedicalRecordItem = {
  name: string;
  category: string;
  /** ISO date when this vaccine was given on the document; omit if not provably administered. */
  administeredDate?: string | null;
  expiryDate?: string | null;
};

export type MedicalRecordExtraction = {
  petName?: string;
  documentType?: string;
  clinicName?: string;
  dateOfVisit?: string;
  items?: MedicalRecordItem[];
  confidenceScore?: number;
};

export type PetDocumentClinicalSyncResult = {
  synced?: boolean;
  vaccinationsCreated?: number;
  medicationsCreated?: number;
  clinicalExamsCreated?: number;
  labResultsCreated?: number;
  skippedDuplicates?: number;
  clinicalRowsCreated?: number;
  error?: string | null;
};

export function parseMedicalRecordExtraction(raw: unknown): MedicalRecordExtraction | null {
  if (raw == null) return null;
  let o: Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      o = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (typeof raw === "object") {
    o = raw as Record<string, unknown>;
  } else {
    return null;
  }

  const itemsRaw = o.items;
  const items: MedicalRecordItem[] = Array.isArray(itemsRaw)
    ? itemsRaw
        .map((row): MedicalRecordItem | null => {
          if (!row || typeof row !== "object") return null;
          const r = row as Record<string, unknown>;
          const name = typeof r.name === "string" ? r.name.trim() : "";
          const category = typeof r.category === "string" ? r.category.trim() : "";
          if (!name) return null;
          const item: MedicalRecordItem = {
            name,
            category,
            administeredDate:
              typeof r.administeredDate === "string" && r.administeredDate.trim() !== ""
                ? r.administeredDate.trim()
                : undefined,
            expiryDate:
              typeof r.expiryDate === "string" && r.expiryDate.trim() !== ""
                ? r.expiryDate.trim()
                : undefined,
          };
          return item;
        })
        .filter((x): x is MedicalRecordItem => x != null)
    : [];

  return {
    petName: typeof o.petName === "string" ? o.petName : undefined,
    documentType: typeof o.documentType === "string" ? o.documentType : undefined,
    clinicName: typeof o.clinicName === "string" ? o.clinicName : undefined,
    dateOfVisit: typeof o.dateOfVisit === "string" ? o.dateOfVisit : undefined,
    items,
    confidenceScore: typeof o.confidenceScore === "number" ? o.confidenceScore : undefined,
  };
}

function hasAdministrationProof(item: MedicalRecordItem): boolean {
  return Boolean(item.administeredDate?.trim());
}

export function medicalRecordToVaccinationInserts(
  petId: string,
  extraction: MedicalRecordExtraction,
  documentPath?: string
): VaccinationInsert[] {
  const clinic = extraction.clinicName?.trim() || null;
  return (extraction.items ?? [])
    .filter(hasAdministrationProof)
    .map((item) => ({
      pet_id: petId,
      name: item.name,
      date: item.administeredDate!.trim(),
      next_due_date: item.expiryDate?.trim() || null,
      clinic_name: clinic,
      notes: "",
      document_url: documentPath ?? null,
      created_at: new Date().toISOString(),
    }));
}

export function formatClinicalSyncMessage(sync?: PetDocumentClinicalSyncResult | null): string | null {
  if (!sync) return null;
  const created = sync.clinicalRowsCreated ?? 0;
  const parts: string[] = [];
  if ((sync.vaccinationsCreated ?? 0) > 0) {
    parts.push(`${sync.vaccinationsCreated} vaccine record${sync.vaccinationsCreated === 1 ? "" : "s"}`);
  }
  if ((sync.medicationsCreated ?? 0) > 0) {
    parts.push(`${sync.medicationsCreated} medication${sync.medicationsCreated === 1 ? "" : "s"}`);
  }
  if ((sync.clinicalExamsCreated ?? 0) > 0) {
    parts.push(`${sync.clinicalExamsCreated} clinical visit${sync.clinicalExamsCreated === 1 ? "" : "s"}`);
  }
  if ((sync.labResultsCreated ?? 0) > 0) {
    parts.push(`${sync.labResultsCreated} lab result${sync.labResultsCreated === 1 ? "" : "s"}`);
  }
  if (parts.length > 0) {
    return `Added ${parts.join(", ")} to health records.`;
  }
  if ((sync.skippedDuplicates ?? 0) > 0) {
    return "Document saved. Matching records were already on file.";
  }
  if (sync.error) {
    return "Document saved to your vault. Review details to add structured records.";
  }
  if (created === 0) {
    return "Document saved. We could not auto-import structured records from this file.";
  }
  return null;
}
