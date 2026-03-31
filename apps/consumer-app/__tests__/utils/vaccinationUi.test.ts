import { getRequiredVaccinesCompliantBody } from "@/utils/vaccinationUi";

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
});
