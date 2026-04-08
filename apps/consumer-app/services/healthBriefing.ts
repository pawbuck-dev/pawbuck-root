import type { Tables } from "@/database.types";
import { fetchClinicalExams } from "@/services/clinicalExams";
import { fetchMedicines } from "@/services/medicines";
import {
  fetchJournalEntries,
  fetchPetAllergies,
  fetchPetConditions,
  type PetJournalEntry,
} from "@/services/petJournal";
import { getVaccinationsByPetId } from "@/services/vaccinations";
import type { MedicineData } from "@/types/medication";

export type HealthBriefingBundle = {
  journal: PetJournalEntry[];
  allergies: Tables<"pet_allergies">[];
  conditions: Tables<"pet_conditions">[];
  medicines: MedicineData[];
  exams: Awaited<ReturnType<typeof fetchClinicalExams>>;
  vaccinations: Tables<"vaccinations">[];
};

/** Single fetch used by Health Briefing screen + dashboard card (shared React Query cache). */
export async function fetchHealthBriefingBundle(petId: string): Promise<HealthBriefingBundle> {
  const [journal, allergies, conditions, medicines, exams, vaccinations] = await Promise.all([
    fetchJournalEntries(petId),
    fetchPetAllergies(petId),
    fetchPetConditions(petId),
    fetchMedicines(petId),
    fetchClinicalExams(petId),
    getVaccinationsByPetId(petId),
  ]);
  return { journal, allergies, conditions, medicines, exams, vaccinations };
}
