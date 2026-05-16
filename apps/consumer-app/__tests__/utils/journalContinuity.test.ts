import {
  countEntriesInWindow,
  formatEntryDateRelative,
  formatJournalEntryCountLabel,
  formatLastEntryMeta,
  formatLastJournalContinuityLine,
  formatLatestEntrySubtitle,
  formatLatestEntryTitle,
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
      subtype: "symptom",
    } as any);
    expect(line).toContain("today");
    expect(line).toContain("Symptom");
  });
});

describe("formatLatestEntryTitle", () => {
  it("falls back when note is empty", () => {
    expect(formatLatestEntryTitle(null)).toBe("Journal entry");
  });

  it("truncates long notes at word boundary", () => {
    const long = "Eating less than usual and showing back-leg stiffness after walks";
    const title = formatLatestEntryTitle(long, 40);
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(41);
  });
});

describe("formatLatestEntrySubtitle", () => {
  it("includes subtype and triage", () => {
    const sub = formatLatestEntrySubtitle({
      domain: "health",
      subtype: "symptom",
      triage_status: "watching",
      vet_flagged: false,
    } as any);
    expect(sub).toContain("Symptom");
    expect(sub).toContain("watching");
  });

  it("notes vet flagged for health entries", () => {
    const sub = formatLatestEntrySubtitle({
      domain: "health",
      subtype: "symptom",
      triage_status: "active",
      vet_flagged: true,
    } as any);
    expect(sub).toContain("vet flagged");
  });
});

describe("formatLastEntryMeta", () => {
  it("uppercases relative date", () => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    expect(formatLastEntryMeta(`${y}-${m}-${d}`)).toBe("TODAY");
  });
});

describe("countEntriesInWindow", () => {
  it("counts entries within the last N calendar days", () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const old = new Date(today);
    old.setDate(old.getDate() - 30);
    const oy = old.getFullYear();
    const om = String(old.getMonth() + 1).padStart(2, "0");
    const od = String(old.getDate()).padStart(2, "0");

    const count = countEntriesInWindow(
      [
        { entry_date: `${y}-${m}-${d}` } as any,
        { entry_date: `${oy}-${om}-${od}` } as any,
      ],
      7
    );
    expect(count).toBe(1);
  });
});

describe("formatJournalEntryCountLabel", () => {
  it("formats windowed count", () => {
    expect(formatJournalEntryCountLabel(12, 7)).toBe("12 entries · last 7 days");
  });

  it("handles zero entries", () => {
    expect(formatJournalEntryCountLabel(0)).toBe("No entries yet");
  });
});
