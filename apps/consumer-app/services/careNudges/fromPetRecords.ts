import {
  buildCareNudges,
  type CareNudge,
  type MissingRequiredInput,
  type VaccinationNudgeInput,
} from "@pawbuck/care-nudges";
import type { MedicineData } from "@/types/medication";
import type { Tables } from "@/database.types";
import type { RequiredVaccinesStatus } from "@/services/vaccineRequirements";
import { getNextMedicationDose } from "@/utils/medication";

export function mapVaccinationsForCareNudges(
  vaccinations: Pick<Tables<"vaccinations">, "id" | "name" | "date" | "next_due_date">[]
): VaccinationNudgeInput[] {
  return vaccinations.map((v) => ({
    id: v.id,
    name: v.name,
    date: v.date,
    next_due_date: v.next_due_date,
  }));
}

export function mapMedicationsForCareNudges(medicines: MedicineData[]) {
  return medicines.map((med) => {
    const next = getNextMedicationDose(med);
    return {
      id: med.id,
      name: med.name,
      nextDoseDateYmd: next ? next.toISOString().slice(0, 10) : null,
    };
  });
}

export function mapMissingRequiredForCareNudges(
  required: RequiredVaccinesStatus | null | undefined
): MissingRequiredInput[] {
  if (!required?.missing?.length) return [];
  return required.missing.map((m) => ({
    canonicalKey: m.canonical_key,
    vaccineName: m.vaccine_name,
  }));
}

export function buildPetCareNudges(input: {
  petId: string;
  petName?: string;
  petCountry?: string | null;
  vaccinations: Pick<Tables<"vaccinations">, "id" | "name" | "date" | "next_due_date">[];
  medicines: MedicineData[];
  requiredStatus?: RequiredVaccinesStatus | null;
  now?: Date;
}): CareNudge[] {
  return buildCareNudges({
    petId: input.petId,
    petName: input.petName,
    petCountry: input.petCountry,
    vaccinations: mapVaccinationsForCareNudges(input.vaccinations),
    medications: mapMedicationsForCareNudges(input.medicines),
    missingRequired: mapMissingRequiredForCareNudges(input.requiredStatus),
    now: input.now,
  });
}

export function careNudgeToCatchUpCard(nudge: CareNudge): {
  id: string;
  type: "vaccination" | "medication";
  title: string;
  subtitle: string;
  domainCategory: "vaccines" | "medications";
  route: string;
} {
  const isMed = nudge.kind === "med_due_today";
  return {
    id: nudge.dedupeKey,
    type: isMed ? "medication" : "vaccination",
    title: nudge.title,
    subtitle: nudge.body,
    domainCategory: isMed ? "medications" : "vaccines",
    route: nudge.deepLink,
  };
}
