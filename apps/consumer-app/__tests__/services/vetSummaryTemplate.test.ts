import { buildVetSummaryHtml } from "@/services/vetSummaryTemplate";
import type { HealthExportBundle } from "@/services/healthExportBundle";
import type { Pet } from "@/context/petsContext";
import { buildDeterministicClinicalSummary } from "@/services/buildClinicalSummary";
import { countRenderedPages } from "@/services/healthExportPageBuilder";

function makeBundle(overrides: Partial<HealthExportBundle> = {}): HealthExportBundle {
  const pet = {
    id: "p1",
    name: "Milo",
    breed: "Maltese",
    animal_type: "dog",
    sex: "Male",
    date_of_birth: "2022-03-12",
    weight_value: 12,
    weight_unit: "lbs",
    microchip_number: "9851410000002847",
    email_id: "milo",
    pet_parent_display_name: "Test Owner",
  } as Pet;

  const bundle: HealthExportBundle = {
    pet,
    vaccinations: [],
    vaultDocuments: [],
    weightLogs: [],
    behaviorBaseline: null,
    owner: { name: "Test Owner", email: "t@t.com", phone: "+16045551247", address: "BC" },
    primaryVet: null,
    petEmail: "milo@pawbuck.app",
    generatedAt: "2026-04-19T12:00:00.000Z",
    journal: [],
    allergies: [],
    conditions: [],
    medicines: [],
    exams: [],
    labResults: [],
    dailyIntakeHistory: [],
    walkSessions: [],
    ...overrides,
  };
  return bundle;
}

describe("vetSummaryTemplate", () => {
  it("sparse bundle renders fewer than 4 pages", () => {
    const bundle = makeBundle();
    const clinical = buildDeterministicClinicalSummary(bundle);
    const html = buildVetSummaryHtml({ bundle, clinical });
    expect(countRenderedPages(html)).toBeLessThan(4);
    expect(html).not.toMatch(/Page 1 of 4/);
  });

  it("always includes record-based summary label", () => {
    const bundle = makeBundle();
    const clinical = buildDeterministicClinicalSummary(bundle);
    const html = buildVetSummaryHtml({ bundle, clinical });
    expect(html).toContain("Record-based summary");
    expect(html).not.toContain("Confidence");
  });

  it("rich bundle can render up to 4 pages with labs and insurance", () => {
    const bundle = makeBundle({
      vaccinations: [
        {
          id: "v1",
          name: "Rabies",
          date: "2025-07-03",
          next_due_date: "2028-07-03",
          clinic_name: "Clinic",
          pet_id: "p1",
          user_id: "u1",
          created_at: "",
          document_url: null,
          notes: null,
        },
      ] as HealthExportBundle["vaccinations"],
      labResults: [
        {
          id: "l1",
          pet_id: "p1",
          user_id: "u1",
          created_at: "",
          updated_at: "",
          test_type: "CBC",
          lab_name: "Lab",
          test_date: "2026-02-01",
          ordered_by: null,
          results: [
            {
              testName: "ALT",
              value: "42",
              unit: "U/L",
              referenceRange: "10-100",
              status: "normal",
            },
          ],
        },
      ] as HealthExportBundle["labResults"],
      vaultDocuments: [
        {
          id: "d1",
          pet_id: "p1",
          user_id: "u1",
          created_at: "2026-01-01",
          updated_at: "",
          document_type: "insurance_policy",
          confidence: 90,
          extracted_json: {
            title: "Policy",
            keyFacts: [
              { label: "Carrier", value: "Trupanion" },
              { label: "Policy number", value: "TRU-123" },
            ],
          },
          storage_path: "",
          expiry_date: null,
        },
      ] as HealthExportBundle["vaultDocuments"],
      exams: [
        {
          id: "e1",
          exam_date: "2025-10-10",
          clinic_name: "Beach Clinic",
          exam_type: "Wellness",
          findings: "Unremarkable",
          notes: null,
          pet_id: "p1",
          user_id: "u1",
          created_at: "",
          updated_at: "",
          document_url: null,
          follow_up_date: null,
          heart_rate: null,
          respiratory_rate: null,
          temperature: null,
        },
      ] as HealthExportBundle["exams"],
    });
    const clinical = buildDeterministicClinicalSummary(bundle);
    const html = buildVetSummaryHtml({ bundle, clinical, qrDataUri: "data:image/png;base64,abc" });
    expect(html).toContain("TRENDING LAB MARKERS");
    expect(html).toContain("INSURANCE ON FILE");
    expect(html).toContain("VERIFY SOURCE RECORDS");
    expect(countRenderedPages(html)).toBeGreaterThanOrEqual(2);
  });
});
