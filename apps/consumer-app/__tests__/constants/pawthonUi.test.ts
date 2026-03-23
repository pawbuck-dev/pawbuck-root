import {
  formatDurationWalk,
  formatMiles,
  formatPace,
  metersToMiles,
  paceMinPerMile,
} from "@/constants/pawthonUi";

describe("pawthonUi", () => {
  it("metersToMiles converts", () => {
    expect(metersToMiles(1609.344)).toBeCloseTo(1, 5);
  });

  it("formatMiles uses two decimals under 10 miles", () => {
    expect(formatMiles(1.234)).toBe("1.23");
  });

  it("formatMiles uses one decimal from 10 miles up", () => {
    expect(formatMiles(10.456)).toBe("10.5");
  });

  it("formatPace returns em dash when invalid", () => {
    expect(formatPace(0)).toBe("—");
    expect(formatPace(NaN)).toBe("—");
  });

  it("paceMinPerMile computes from duration and miles", () => {
    expect(paceMinPerMile(600, 1)).toBeCloseTo(10, 5);
  });

  it("formatDurationWalk formats seconds and minutes", () => {
    expect(formatDurationWalk(45)).toBe("45 sec");
    expect(formatDurationWalk(120)).toBe("2 min");
    expect(formatDurationWalk(3600)).toBe("1h 0m");
  });
});
