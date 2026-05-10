import { getRequiredVaccinesCompliantBody, getVaccineDueBadge } from "@/utils/vaccinationUi";

describe("getVaccineDueBadge", () => {
  it("shows Previous dose when not the latest administration for that vaccine name", () => {
    const b = getVaccineDueBadge("2024-01-01", "required", {
      isLatestAdministrationForVaccine: false,
    });
    expect(b?.variant).toBe("previous");
    expect(b?.label).toBe("Previous dose");
  });
});

describe("getRequiredVaccinesCompliantBody", () => {
  it("returns U.S. copy for United States", () => {
    const s = getRequiredVaccinesCompliantBody("United States");
    expect(s).toContain("U.S. state and federal");
  });

  it("returns Canadian copy for Canada", () => {
    const s = getRequiredVaccinesCompliantBody("Canada");
    expect(s).toContain("Canadian provincial");
  });

  it("returns U.K. copy for United Kingdom", () => {
    const s = getRequiredVaccinesCompliantBody("United Kingdom");
    expect(s).toContain("U.K.");
  });

  it("uses country name for other regions", () => {
    expect(getRequiredVaccinesCompliantBody("Australia")).toContain("Australia");
  });

  it("falls back when country is missing", () => {
    expect(getRequiredVaccinesCompliantBody(undefined)).toContain("your region");
  });

  it("uses neutral copy for Other country", () => {
    const s = getRequiredVaccinesCompliantBody("Other");
    expect(s.toLowerCase()).toContain("checklist");
    expect(s.toLowerCase()).toContain("other");
  });
});
