import { formatClinicalExamsForAI, getClinicalExams } from "./clinicalExams.js";
import { formatLabResultsForAI, getLabResults } from "./labResults.js";
import { formatMedicationsForAI, getMedications } from "./medications.js";
import { formatVaccinationsForAI, getVaccinations } from "./vaccinations.js";

export interface HealthSummary {
  vaccinationCount: number;
  medicationCount: number;
  labResultCount: number;
  clinicalExamCount: number;
  vaccinationsText: string;
  medicationsText: string;
  labResultsText: string;
  clinicalExamsText: string;
  fullSummary: string;
}

export async function getHealthSummary(petId: string): Promise<HealthSummary> {
  const [vaccinations, medications, labResults, clinicalExams] = await Promise.all([
    getVaccinations(petId),
    getMedications(petId),
    getLabResults(petId),
    getClinicalExams(petId),
  ]);

  const vaccinationsText = formatVaccinationsForAI(vaccinations);
  const medicationsText = formatMedicationsForAI(medications);
  const labResultsText = formatLabResultsForAI(labResults);
  const clinicalExamsText = formatClinicalExamsForAI(clinicalExams);

  const fullSummary = `
=== PET HEALTH SUMMARY ===

${vaccinationsText}

---

${medicationsText}

---

${labResultsText}

---

${clinicalExamsText}
`.trim();

  return {
    vaccinationCount: vaccinations.length,
    medicationCount: medications.length,
    labResultCount: labResults.length,
    clinicalExamCount: clinicalExams.length,
    vaccinationsText,
    medicationsText,
    labResultsText,
    clinicalExamsText,
    fullSummary,
  };
}
