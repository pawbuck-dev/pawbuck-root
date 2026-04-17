import { convertWeight, kgToLbs, lbsToKg } from "@/utils/weightUnits";

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
});
