import { buildMedicationNudges } from "./buildMedicationNudges";
import { buildMissingRequiredNudges } from "./buildMissingRequiredNudges";
import { buildVaccinationNudges } from "./buildVaccinationNudges";
import { capCareNudges, rankCareNudges } from "./rankNudges";
import type { BuildCareNudgesInput, CareNudge } from "./types";

export function buildCareNudges(input: BuildCareNudgesInput): CareNudge[] {
  const vaccinationNudges = buildVaccinationNudges({
    petId: input.petId,
    petName: input.petName,
    petCountry: input.petCountry,
    vaccinations: input.vaccinations,
    now: input.now,
  });

  const medicationNudges = buildMedicationNudges({
    petId: input.petId,
    petName: input.petName,
    medications: input.medications,
    now: input.now,
  });

  const missingNudges =
    input.missingRequired && input.missingRequired.length > 0
      ? buildMissingRequiredNudges({
          petId: input.petId,
          petName: input.petName,
          missingRequired: input.missingRequired,
        })
      : [];

  return rankCareNudges([...vaccinationNudges, ...medicationNudges, ...missingNudges]);
}

export function buildCareNudgesForDisplay(input: BuildCareNudgesInput, max = 10): CareNudge[] {
  return capCareNudges(buildCareNudges(input), max);
}

export type { CareNudge, BuildCareNudgesInput };
