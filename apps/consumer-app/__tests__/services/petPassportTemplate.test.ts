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
    };

    const html = buildPetPassportHtml({ bundle, petPhotoDataUri: null, qrDataUri: null });
    expect(html).toContain("01 / 03");
    expect(html).toContain("03 / 03");
    expect(html).toContain("OWNER &amp; EMERGENCY CONTACTS");
    expect(html).toContain("HANDLING NOTES");
    expect(html).toContain("VACCINATION STATUS");
    expect(html).toContain("VERIFY &amp; LIVE UPDATES");
  });
});
