import { nextIntakeCount } from "@/utils/dailyIntakeMutations";

describe("nextIntakeCount", () => {
  it("increments by 1", () => {
    expect(nextIntakeCount(0, 1)).toBe(1);
    expect(nextIntakeCount(2, 1)).toBe(3);
  });

  it("decrements with floor at 0", () => {
    expect(nextIntakeCount(2, -1)).toBe(1);
    expect(nextIntakeCount(0, -1)).toBe(0);
  });

  it("respects max when provided", () => {
    expect(nextIntakeCount(3, 1, 3)).toBe(3);
    expect(nextIntakeCount(2, 1, 3)).toBe(3);
  });
});
