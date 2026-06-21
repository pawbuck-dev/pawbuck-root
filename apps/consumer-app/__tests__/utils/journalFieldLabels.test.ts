import { humanizeJournalFieldKey } from "@/utils/journalFieldLabels";

describe("humanizeJournalFieldKey", () => {
  it("maps RED_FLAGS to Red flags", () => {
    expect(humanizeJournalFieldKey("RED_FLAGS")).toBe("Red flags");
    expect(humanizeJournalFieldKey("red_flags")).toBe("Red flags");
  });

  it("maps known symptom keys", () => {
    expect(humanizeJournalFieldKey("SYMPTOM")).toBe("Symptom");
    expect(humanizeJournalFieldKey("SEVERITY")).toBe("Severity");
  });

  it("humanizes unknown underscore keys", () => {
    expect(humanizeJournalFieldKey("CUSTOM_FIELD")).toBe("Custom Field");
  });

  it("returns empty for blank input", () => {
    expect(humanizeJournalFieldKey("")).toBe("");
    expect(humanizeJournalFieldKey("   ")).toBe("");
  });
});
