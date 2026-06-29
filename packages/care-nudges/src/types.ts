export type CareNudgeKind =
  | "vac_overdue"
  | "vac_due_soon"
  | "vac_missing_required"
  | "med_due_today"
  | "vet_appt_24h"
  | "vet_appt_1h"
  | "doc_expiry"
  | "journal_prompt"
  | "senior_mobility_tip"
  | "pawthon_streak";

export type CareNudgeChannel = "in_app" | "local" | "push";

export type CareNudgeEvidence = {
  table: string;
  id: string;
};

export type CareNudge = {
  kind: CareNudgeKind;
  dedupeKey: string;
  petId: string;
  petName?: string;
  priority: number;
  title: string;
  body: string;
  deepLink: string;
  evidence?: CareNudgeEvidence;
  validUntil?: string;
  channels: CareNudgeChannel[];
};

export type VaccinationNudgeInput = {
  id: string;
  name: string;
  date: string;
  next_due_date: string | null;
};

export type MedicationNudgeInput = {
  id: string;
  name: string;
  nextDoseDateYmd: string | null;
};

export type MissingRequiredInput = {
  canonicalKey: string;
  vaccineName: string;
};

export type BuildCareNudgesInput = {
  petId: string;
  petName?: string;
  petCountry?: string | null;
  vaccinations: VaccinationNudgeInput[];
  medications: MedicationNudgeInput[];
  missingRequired?: MissingRequiredInput[];
  now?: Date;
};
