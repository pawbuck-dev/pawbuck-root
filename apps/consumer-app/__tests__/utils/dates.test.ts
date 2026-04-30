import {
  formatDate,
  formatDateLong,
  formatDateMedium,
  formatTime,
  getEarliestDate,
  isFutureDate,
  isPastDate,
  isToday,
  setTimeOnDate,
  sortDatesAsc,
  timeStringToMinutes,
} from "@/utils/dates";

describe("dates utils", () => {
  it("formatDate returns dash for null/undefined", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate(undefined)).toBe("-");
  });

  it("formatDate includes year for valid input", () => {
    expect(formatDate("2026-03-02")).toMatch(/2026/);
  });

  it("formatDateMedium and formatDateLong", () => {
    expect(formatDateMedium("2026-02-20")).toContain("2026");
    expect(formatDateLong("2026-02-20")).toContain("February");
  });

  it("formatTime returns 12h clock pattern", () => {
    const s = formatTime(new Date(2026, 0, 1, 14, 30, 0));
    expect(s).toMatch(/\d{1,2}:\d{2}/);
    expect(s.toLowerCase()).toMatch(/am|pm/);
  });

  it("isPastDate / isFutureDate / isToday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isPastDate(yesterday)).toBe(true);
    expect(isFutureDate(tomorrow)).toBe(true);
    expect(isToday(new Date())).toBe(true);
  });

  it("setTimeOnDate applies hours and minutes", () => {
    const base = new Date("2026-01-10T00:00:00.000Z");
    const out = setTimeOnDate(base, "15:45");
    expect(out.getHours()).toBe(15);
    expect(out.getMinutes()).toBe(45);
  });

  it("timeStringToMinutes", () => {
    expect(timeStringToMinutes("02:30")).toBe(150);
  });

  it("sortDatesAsc and getEarliestDate", () => {
    const d2 = new Date("2026-02-02");
    const d1 = new Date("2026-02-01");
    const d3 = new Date("2026-02-03");
    expect(getEarliestDate([d2, d3, d1])).toEqual(d1);
    const sorted = sortDatesAsc([d3, d1, d2]);
    expect(sorted[0]).toEqual(d1);
    expect(getEarliestDate([])).toBeNull();
  });
});
