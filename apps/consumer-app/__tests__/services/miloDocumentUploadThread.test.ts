import {
  buildDocumentUploadThreadContent,
  summarizeExtractedJsonForChat,
  tryExtractPetNameFromExtractedJson,
  vaultRowDocumentSectionLabel,
} from "@/services/miloDocumentUploadThread";

describe("vaultRowDocumentSectionLabel", () => {
  it("maps known types", () => {
    expect(vaultRowDocumentSectionLabel("vaccinations")).toBe("Vaccines");
    expect(vaultRowDocumentSectionLabel("lab_results")).toBe("Lab results");
  });

  it("falls back for unknown", () => {
    expect(vaultRowDocumentSectionLabel("unknown_type")).toBe("Health records");
  });
});

describe("tryExtractPetNameFromExtractedJson", () => {
  it("reads pet_name", () => {
    expect(tryExtractPetNameFromExtractedJson(JSON.stringify({ pet_name: "Benji" }))).toBe("Benji");
  });

  it("returns null on bad json", () => {
    expect(tryExtractPetNameFromExtractedJson("not json")).toBeNull();
  });
});

describe("summarizeExtractedJsonForChat", () => {
  it("lists structured vaccine items with dates", () => {
    const summary = summarizeExtractedJsonForChat(
      JSON.stringify({
        clinicName: "Beach Avenue Animal Hospital",
        dateOfVisit: "2025-10-11",
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
      })
    );
    expect(summary).toContain("Here's what I found");
    expect(summary).toContain("• DAPP");
    expect(summary).toContain("Bordetella");
    expect(summary).toContain("Beach Avenue Animal Hospital");
  });

  it("falls back to flexible title and summary", () => {
    const summary = summarizeExtractedJsonForChat(
      JSON.stringify({
        title: "Rabies certificate",
        summary: "Rabies vaccine administered",
        primaryDate: "2025-07-04",
      })
    );
    expect(summary).toContain("Rabies certificate");
    expect(summary).toContain("Rabies vaccine administered");
    expect(summary).toContain("• Date:");
  });
});

describe("buildDocumentUploadThreadContent", () => {
  const pets = [
    { id: "1", name: "Test" },
    { id: "2", name: "Benji" },
  ];

  it("includes OCR summary and section closing for vaccines", () => {
    const { assistantContent } = buildDocumentUploadThreadContent(
      {
        documentType: "vaccinations",
        extractedJson: JSON.stringify({
          items: [
            {
              name: "Rabies",
              category: "vaccination",
              administeredDate: "2025-07-04",
              expiryDate: "2028-07-04",
            },
          ],
        }),
        clinicalSync: { vaccinationsCreated: 1, clinicalRowsCreated: 1 },
      },
      { id: "1", name: "Pawsome" },
      [{ id: "1", name: "Pawsome" }]
    );
    expect(assistantContent).toContain("Here's what I found");
    expect(assistantContent).toContain("• Rabies");
    expect(assistantContent).toContain("1 vaccine record");
    expect(assistantContent).toContain("Everything is saved under Vaccines for Pawsome");
  });

  it("adds mismatch hint when extracted name matches another pet", () => {
    const { assistantContent } = buildDocumentUploadThreadContent(
      {
        documentType: "vaccinations",
        extractedJson: JSON.stringify({ pet_name: "Benji" }),
      },
      { id: "1", name: "Test" },
      pets
    );
    expect(assistantContent).toContain("Benji");
    expect(assistantContent).toContain("Select pet");
  });

  it("does not hint when only one pet", () => {
    const { assistantContent } = buildDocumentUploadThreadContent(
      {
        documentType: "vaccinations",
        extractedJson: JSON.stringify({ pet_name: "Other" }),
      },
      { id: "1", name: "Test" },
      [{ id: "1", name: "Test" }]
    );
    expect(assistantContent).not.toContain("Select pet");
  });
});
