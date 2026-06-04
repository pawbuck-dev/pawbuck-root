import { buildDeterministicClinicalSummary } from "@/services/buildClinicalSummary";
import type { HealthExportBundle } from "@/services/healthExportBundle";
import type { Pet } from "@/context/petsContext";

function minimalBundle(over: Partial<HealthExportBundle> = {}): HealthExportBundle {
  const pet = {
    id: "p1",
    name: "Milo",
    breed: "Maltese",
    animal_type: "dog",
    sex: "Male",
    date_of_birth: "2022-03-12",
    weight_value: 5.6,
    weight_unit: "kg",
    microchip_number: "9851410000002847",
    passport_number: null,
    country: "Canada",
    email_id: "milo",
    pet_parent_display_name: "Owner",
    color: "White",
  } as Pet;

  return {
    pet,
    vaccinations: [],
    vaultDocuments: [],
    weightLogs: [],
    behaviorBaseline: null,
    owner: { name: "Owner", email: "o@test.com", phone: "—", address: "—" },
    primaryVet: null,
    petEmail: "milo@pawbuck.app",
    generatedAt: new Date().toISOString(),
    journal: [],
    allergies: [],
    conditions: [],
    medicines: [],
    exams: [],
    labResults: [],
    dailyIntakeHistory: [],
    walkSessions: [],
    ...over,
  };
}

describe("buildDeterministicClinicalSummary", () => {
  it("includes pet name and breed", () => {
    const r = buildDeterministicClinicalSummary(minimalBundle());
    expect(r.narrative).toContain("Milo");
    expect(r.narrative).toContain("Maltese");
    expect(r.confidencePercent).toBeNull();
  });

  it("mentions allergies when present", () => {
    const r = buildDeterministicClinicalSummary(
      minimalBundle({
        allergies: [{ id: "1", label: "Chicken", pet_id: "p1", user_id: "u", created_at: "", updated_at: "", notes: null }],
      } as Partial<HealthExportBundle>)
    );
    expect(r.narrative).toContain("Chicken");
  });
});
