import { convertWeight, formatPetWeightForDisplay, formatWeightOneDecimal, kgToLbs, lbsToKg } from "@/utils/weightUnits";

describe("weightUnits", () => {
  it("converts kg to lbs", () => {
    expect(kgToLbs(10)).toBeCloseTo(22.046, 2);
  });

  it("converts lbs to kg", () => {
    expect(lbsToKg(22.046226218)).toBeCloseTo(10, 2);
  });

  it("noop when units match", () => {
    expect(convertWeight(50, "lbs", "lbs")).toBe(50);
  });

  it("formatWeightOneDecimal rounds to one decimal", () => {
    expect(formatWeightOneDecimal(12.56634894426)).toBe("12.6");
    expect(formatWeightOneDecimal(78)).toBe("78.0");
  });

  it("formatPetWeightForDisplay includes unit label", () => {
    expect(formatPetWeightForDisplay(12.56634894426, "lbs")).toBe("12.6 lbs");
    expect(formatPetWeightForDisplay(null, "lbs")).toBeNull();
    expect(formatPetWeightForDisplay(0, "lbs")).toBeNull();
  });
});
