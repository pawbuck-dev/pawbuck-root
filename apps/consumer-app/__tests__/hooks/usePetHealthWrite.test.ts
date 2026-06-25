import { canWritePetHealth } from "@/hooks/usePetHealthWrite";

describe("canWritePetHealth", () => {
  it("allows owner, admin, and contributor", () => {
    expect(canWritePetHealth("owner")).toBe(true);
    expect(canWritePetHealth("admin")).toBe(true);
    expect(canWritePetHealth("contributor")).toBe(true);
  });

  it("denies view_only and null", () => {
    expect(canWritePetHealth("view_only")).toBe(false);
    expect(canWritePetHealth(null)).toBe(false);
    expect(canWritePetHealth(undefined)).toBe(false);
  });
});
