import { computeVaccineReminderFires } from "@/utils/vaccineReminderDates";

describe("computeVaccineReminderFires", () => {
  it("returns 30d, 7d, and day-of when due date is far in the future", () => {
    const now = new Date(2026, 4, 1, 8, 0, 0); // May 1 2026 8 AM local
    const fires = computeVaccineReminderFires("2026-06-10", now);
    const offsets = fires.map((f) => f.offsetDays).sort((a, b) => b - a);
    expect(offsets).toEqual([30, 7, 0]);
    fires.forEach((f) => {
      expect(f.fireAt.getHours()).toBe(9);
      expect(f.fireAt.getMinutes()).toBe(0);
    });
  });

  it("omits 30d and 7d when those days are already past", () => {
    const now = new Date(2026, 5, 8, 8, 0, 0); // June 8 2026 — due June 10
    const fires = computeVaccineReminderFires("2026-06-10", now);
    const offsets = fires.map((f) => f.offsetDays).sort((a, b) => b - a);
    expect(offsets).toEqual([0]);
  });

  it("returns empty for invalid date string", () => {
    expect(computeVaccineReminderFires("not-a-date", new Date())).toEqual([]);
  });
});
