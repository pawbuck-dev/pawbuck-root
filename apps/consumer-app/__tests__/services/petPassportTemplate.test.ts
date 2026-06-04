import { buildPetPassportHtml } from "@/services/petPassportTemplate";
import type { HealthExportBundle } from "@/services/healthExportBundle";
import type { Pet } from "@/context/petsContext";

describe("petPassportTemplate", () => {
  it("renders three pages with v2 section markers", () => {
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
      passport_number: "DK 1234",
      country: "Canada",
      email_id: "milo",
      color: "White",
      pet_parent_display_name: "Test Owner",
    } as Pet;

    const bundle: HealthExportBundle = {
      pet,
      vaccinations: [],
      vaultDocuments: [],
      weightLogs: [],
      behaviorBaseline: null,
      owner: { name: "Test Owner", email: "t@t.com", phone: "+16045551247", address: "BC" },
      primaryVet: {
        clinicName: "Beach Clinic",
        veterinarian: "Dr. Smith, DVM",
        phone: "555-0000",
        petEmail: "milo@pawbuck.app",
      },
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
    };

    const html = buildPetPassportHtml({ bundle, petPhotoDataUri: null, qrDataUri: null });
    expect(html).toContain("01 / 03");
    expect(html).toContain("03 / 03");
    expect(html).toContain("OWNER &amp; PRIMARY VET");
    expect(html).toContain("HANDLING NOTES");
    expect(html).toContain("VACCINATION STATUS");
    expect(html).toContain("VERIFY &amp; LIVE UPDATES");
  });

  it("includes travel titer block when lab titer on file", () => {
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
    } as Pet;

    const bundle: HealthExportBundle = {
      pet,
      vaccinations: [],
      vaultDocuments: [],
      weightLogs: [],
      behaviorBaseline: null,
      owner: { name: "Owner", email: "t@t.com", phone: "555", address: "BC" },
      primaryVet: null,
      petEmail: "milo@pawbuck.app",
      generatedAt: "2026-04-19T12:00:00.000Z",
      journal: [],
      allergies: [],
      conditions: [],
      medicines: [],
      exams: [],
      labResults: [
        {
          id: "l1",
          pet_id: "p1",
          user_id: "u1",
          created_at: "",
          updated_at: "",
          test_type: "Rabies FAVN",
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
        },
      ],
      dailyIntakeHistory: [],
      walkSessions: [],
    };

    const html = buildPetPassportHtml({ bundle, petPhotoDataUri: null, qrDataUri: null });
    expect(html).toContain("TRAVEL CERTIFICATES");
    expect(html).toContain("RABIES NEUTRALIZING ANTIBODY TITER");
    expect(html).toContain("0.9 IU/mL");
  });

  it("omits travel block when no titer or travel docs", () => {
    const pet = { id: "p1", name: "Milo", breed: "Maltese", animal_type: "dog", email_id: "milo" } as Pet;
    const bundle: HealthExportBundle = {
      pet,
      vaccinations: [],
      vaultDocuments: [],
      weightLogs: [],
      behaviorBaseline: null,
      owner: { name: "O", email: "t@t.com", phone: "555", address: "BC" },
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
    };
    const html = buildPetPassportHtml({ bundle, petPhotoDataUri: null, qrDataUri: null });
    expect(html).not.toContain("TRAVEL CERTIFICATES");
  });
});
