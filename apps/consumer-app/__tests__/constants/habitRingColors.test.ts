import { habitRingPercent, HABIT_RING_STROKE } from "@/constants/habitRingColors";

describe("habitRingColors", () => {
  it("defines distinct stroke colors per variant", () => {
    const colors = Object.values(HABIT_RING_STROKE);
    expect(new Set(colors).size).toBe(4);
  });

  it("caps ring percent at 100 when count exceeds target", () => {
    expect(habitRingPercent(3, 6)).toBe(50);
    expect(habitRingPercent(6, 6)).toBe(100);
    expect(habitRingPercent(9, 6)).toBe(100);
  });

  it("returns 0 when target is invalid", () => {
    expect(habitRingPercent(2, 0)).toBe(0);
  });
});
