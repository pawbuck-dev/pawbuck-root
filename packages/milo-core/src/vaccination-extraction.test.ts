import { hasVaccinationAdministrationProof } from "./vaccination-extraction";

describe("hasVaccinationAdministrationProof", () => {
  it("returns true when administeredDate is set", () => {
    expect(
      hasVaccinationAdministrationProof({ administeredDate: "2025-10-11" })
    ).toBe(true);
  });

  it("returns false when administeredDate is missing or blank", () => {
    expect(hasVaccinationAdministrationProof({})).toBe(false);
    expect(hasVaccinationAdministrationProof({ administeredDate: "" })).toBe(false);
    expect(hasVaccinationAdministrationProof({ administeredDate: "   " })).toBe(false);
  });
});
