import {
  formatClinicalSyncMessage,
  medicalRecordToVaccinationInserts,
  parseMedicalRecordExtraction,
} from "@/utils/medicalRecordExtraction";

describe("medicalRecordExtraction", () => {
  it("parses structured medical record JSON", () => {
    const parsed = parseMedicalRecordExtraction({
      petName: "Milo",
      dateOfVisit: "2025-10-11",
      clinicName: "Beach Avenue Animal Hospital",
      items: [
        {
          name: "DAPP",
          category: "vaccination",
          administeredDate: "2025-10-11",
          expiryDate: "2028-10-10",
        },
        {
          name: "Bordetella",
          category: "vaccination",
          administeredDate: "2025-10-11",
          expiryDate: "2026-10-11",
        },
      ],
    });
    expect(parsed?.items).toHaveLength(2);
  });

  it("maps only items with administeredDate to vaccination inserts", () => {
    const inserts = medicalRecordToVaccinationInserts(
      "pet-1",
      {
        dateOfVisit: "2025-10-11",
        clinicName: "Clinic",
        items: [
          {
            name: "Bordetella",
            category: "vaccination",
            administeredDate: "2025-10-11",
            expiryDate: "2026-10-11",
          },
          { name: "Rabies", category: "vaccination", expiryDate: "2028-07-04" },
        ],
      },
      "path/to/doc.pdf"
    );
    expect(inserts).toHaveLength(1);
    expect(inserts[0].name).toBe("Bordetella");
    expect(inserts[0].date).toBe("2025-10-11");
    expect(inserts[0].document_url).toBe("path/to/doc.pdf");
  });

  it("does not infer administered date from dateOfVisit alone", () => {
    const inserts = medicalRecordToVaccinationInserts("pet-1", {
      dateOfVisit: "2025-10-11",
      items: [{ name: "Rabies", category: "vaccination", expiryDate: "2028-07-04" }],
    });
    expect(inserts).toHaveLength(0);
  });

  it("formats clinical sync success message", () => {
    expect(
      formatClinicalSyncMessage({
        vaccinationsCreated: 2,
        clinicalRowsCreated: 2,
      })
    ).toContain("2 vaccine records");
  });
});
