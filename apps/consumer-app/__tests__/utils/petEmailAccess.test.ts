import { canAssignPetEmailAddress } from "@/utils/petEmailAccess";

describe("canAssignPetEmailAddress", () => {
  it("allows first pet email on any plan", () => {
    expect(canAssignPetEmailAddress("free", 0)).toBe(true);
    expect(canAssignPetEmailAddress("individual", 0)).toBe(true);
    expect(canAssignPetEmailAddress("family", 0)).toBe(true);
  });

  it("requires Family when assigning email for an additional pet", () => {
    expect(canAssignPetEmailAddress("free", 1)).toBe(false);
    expect(canAssignPetEmailAddress("individual", 1)).toBe(false);
    expect(canAssignPetEmailAddress("family", 1)).toBe(true);
  });
});
