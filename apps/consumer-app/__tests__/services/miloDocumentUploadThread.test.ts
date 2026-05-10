import {
  buildDocumentUploadThreadContent,
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

describe("buildDocumentUploadThreadContent", () => {
  const pets = [
    { id: "1", name: "Test" },
    { id: "2", name: "Benji" },
  ];

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
