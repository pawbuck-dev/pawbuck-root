jest.mock("@/services/petJournal", () => ({
  fetchJournalEntries: jest.fn().mockResolvedValue([{ id: "j1" }]),
  fetchPetAllergies: jest.fn().mockResolvedValue([]),
  fetchPetConditions: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/services/medicines", () => ({
  fetchMedicines: jest.fn().mockResolvedValue([{ id: "m1" }]),
}));
jest.mock("@/services/clinicalExams", () => ({
  fetchClinicalExams: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/services/vaccinations", () => ({
  getVaccinationsByPetId: jest.fn().mockResolvedValue([{ id: "v1" }]),
}));

import { fetchClinicalExams } from "@/services/clinicalExams";
import { fetchHealthBriefingBundle } from "@/services/healthBriefing";
import { fetchMedicines } from "@/services/medicines";
import { fetchJournalEntries } from "@/services/petJournal";
import { getVaccinationsByPetId } from "@/services/vaccinations";

describe("healthBriefing", () => {
  it("fetchHealthBriefingBundle aggregates all sources", async () => {
    const bundle = await fetchHealthBriefingBundle("pet-1");

    expect(fetchJournalEntries).toHaveBeenCalledWith("pet-1");
    expect(fetchMedicines).toHaveBeenCalledWith("pet-1");
    expect(fetchClinicalExams).toHaveBeenCalledWith("pet-1");
    expect(getVaccinationsByPetId).toHaveBeenCalledWith("pet-1");
    expect(bundle.journal).toHaveLength(1);
    expect(bundle.medicines).toHaveLength(1);
    expect(bundle.vaccinations).toHaveLength(1);
  });
});
