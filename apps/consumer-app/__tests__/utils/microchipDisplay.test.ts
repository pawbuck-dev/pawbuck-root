import { formatMicrochipDisplay } from "@/utils/microchipDisplay";

describe("formatMicrochipDisplay", () => {
  it("returns em dash for empty", () => {
    expect(formatMicrochipDisplay(null)).toBe("—");
    expect(formatMicrochipDisplay("")).toBe("—");
  });

  it("groups 15-digit ISO microchips", () => {
    expect(formatMicrochipDisplay("985121004567890")).toBe("985-121-004-567-890");
  });

  it("preserves non-15-digit values", () => {
    expect(formatMicrochipDisplay("ABC123")).toBe("ABC123");
  });
});
