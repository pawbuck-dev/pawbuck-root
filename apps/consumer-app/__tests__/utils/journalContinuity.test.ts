import {
  formatEntryDateRelative,
  formatLastJournalContinuityLine,
} from "@/utils/journalContinuity";

describe("formatEntryDateRelative", () => {
  it("returns today for today's date string", () => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    expect(formatEntryDateRelative(`${y}-${m}-${d}`)).toBe("today");
  });

  it("returns yesterday for prior calendar day", () => {
    const t = new Date();
    t.setDate(t.getDate() - 1);
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    expect(formatEntryDateRelative(`${y}-${m}-${d}`)).toBe("yesterday");
  });
});

describe("formatLastJournalContinuityLine", () => {
  it("returns null when entry missing", () => {
    expect(formatLastJournalContinuityLine(undefined)).toBeNull();
  });

  it("includes relative timing and subtype label", () => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    const line = formatLastJournalContinuityLine({
      entry_date: `${y}-${m}-${d}`,
      subtype: "food_intake",
    } as any);
    expect(line).toContain("today");
    expect(line).toContain("Food Intake");
  });
});
