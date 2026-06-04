import type { Tables } from "@/database.types";
import type { HealthExportBundle } from "@/services/healthExportBundle";
import type { LabResult } from "@/services/labResults";
import type { Pet } from "@/context/petsContext";
import {
  buildAbnormalLabNote,
  buildCaseNarratives,
  buildLabMarkerRows,
  buildMedicalTimeline,
  buildPreventativeRows,
  buildTrendingVitals,
  buildWorkupLabRows,
  parseTravelAndTiterDocs,
} from "@/utils/healthExportDerived";
import { compactPages, section } from "@/services/healthExportPageBuilder";

function minimalBundle(overrides: Partial<HealthExportBundle> = {}): HealthExportBundle {
  const pet = {
    id: "p1",
    name: "Milo",
    breed: "Maltese",
    animal_type: "dog",
    sex: "Male",
    date_of_birth: "2022-03-12",
    weight_value: 12,
    weight_unit: "lbs",
    microchip_number: null,
    email_id: "milo",
  } as Pet;

  return {
    pet,
    vaccinations: [],
    vaultDocuments: [],
    weightLogs: [],
    behaviorBaseline: null,
    owner: { name: "Owner", email: "o@t.com", phone: "555", address: "BC" },
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
}

describe("healthExportDerived", () => {
  it("parseTravelAndTiterDocs finds titer from lab results", () => {
    const lab: LabResult = {
      id: "l1",
      pet_id: "p1",
      user_id: "u1",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      test_type: "Rabies FAVN titer",
      lab_name: "Kansas State Rabies Lab",
      test_date: "2025-08-15",
      ordered_by: null,
      results: [
        {
          testName: "Titer",
          value: "0.9",
          unit: "IU/mL",
          referenceRange: "≥0.5",
          status: "normal",
        },
      ],
    };
    const { titer } = parseTravelAndTiterDocs([], [lab]);
    expect(titer?.resultNumeric).toBe(0.9);
    expect(titer?.meetsEuThreshold).toBe(true);
  });

  it("buildLabMarkerRows dedupes by test name", () => {
    const rows = buildLabMarkerRows([
      {
        id: "l1",
        pet_id: "p1",
        user_id: "u1",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
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
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("ALT");
  });

  it("buildAbnormalLabNote lists abnormal markers", () => {
    const note = buildAbnormalLabNote([
      { name: "Eosinophils", value: "1.4", unit: "×10⁹/L", status: "high" },
    ]);
    expect(note).toContain("Eosinophils");
  });

  it("buildTrendingVitals includes weight from profile when no logs", () => {
    const rows = buildTrendingVitals(minimalBundle());
    expect(rows.some((r) => r.label === "WEIGHT")).toBe(true);
  });

  it("buildCaseNarratives returns narrative when active condition exists", () => {
    const narratives = buildCaseNarratives(
      minimalBundle({
        conditions: [
          {
            id: "c1",
            name: "Atopic dermatitis",
            status: "active",
            pet_id: "p1",
            user_id: "u1",
            created_at: "",
            updated_at: "",
            diagnosed_on: "2026-02-01",
            notes: "Under workup",
          } as Tables<"pet_conditions">,
        ],
      })
    );
    expect(narratives.length).toBeGreaterThan(0);
  });

  it("buildMedicalTimeline merges exams and flagged journal", () => {
    const events = buildMedicalTimeline(
      minimalBundle({
        exams: [
          {
            id: "e1",
            exam_date: "2026-01-10",
            clinic_name: "Beach Clinic",
            exam_type: "Wellness",
            findings: "Grade 1 tartar",
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
          } as Tables<"clinical_exams">,
        ],
      })
    );
    expect(events[0].title).toBe("Wellness");
  });

  it("buildPreventativeRows detects heartworm meds", () => {
    const rows = buildPreventativeRows(
      [
        {
          id: "m1",
          name: "Simparica Trio",
          dosage: "5-10 kg",
          frequency: "monthly",
          last_given_at: "2026-04-01",
          prescribed_by: "Smith",
          purpose: "heartworm",
          pet_id: "p1",
          user_id: "u1",
          created_at: "",
          updated_at: "",
          type: "chewable",
          end_date: null,
          next_due_date: null,
          document_url: null,
          custom_frequency_unit: null,
          custom_frequency_value: null,
          reminder_enabled: false,
          reminder_timing: null,
          schedules: [],
          start_date: null,
        },
      ],
      []
    );
    expect(rows[0].category).toBe("Simparica Trio");
  });

  it("buildWorkupLabRows returns abnormal results only", () => {
    const rows = buildWorkupLabRows([
      {
        id: "l1",
        pet_id: "p1",
        user_id: "u1",
        created_at: "",
        updated_at: "",
        test_type: "CBC",
        lab_name: "Lab",
        test_date: "2026-02-08",
        ordered_by: null,
        results: [
          {
            testName: "Eosinophils",
            value: "1.4",
            unit: "×10⁹/L",
            referenceRange: "0.0-1.2",
            status: "high",
          },
          {
            testName: "WBC",
            value: "9.2",
            unit: "×10⁹/L",
            referenceRange: "5-15",
            status: "normal",
          },
        ],
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].testName).toBe("Eosinophils");
  });

  it("compactPages drops empty middle pages but keeps forced first page", () => {
    const pages = compactPages(
      [
        { sections: [section("a", "content", false)] },
        {
          sections: [
            section("b", "", true),
            section("c", "", true),
          ],
        },
        { sections: [section("d", "more", false)] },
      ],
      [0]
    );
    expect(pages).toHaveLength(2);
  });
});
