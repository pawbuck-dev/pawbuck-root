import { getMiloJournalChipMeta } from "@/utils/miloJournalChipMeta";

describe("getMiloJournalChipMeta", () => {
  it("maps wellness topics to distinct icons", () => {
    expect(getMiloJournalChipMeta("All good today", 0).icon).toBe("checkmark-circle-outline");
    expect(getMiloJournalChipMeta("Vomiting or diarrhea", 0).icon).toBe("medkit-outline");
    expect(getMiloJournalChipMeta("Limping", 0).icon).toBe("walk-outline");
  });

  it("maps duration and timing answers", () => {
    expect(getMiloJournalChipMeta("Just started today", 0).icon).toBe("today-outline");
    expect(getMiloJournalChipMeta("A couple of days", 0).icon).toBe("time-outline");
    expect(getMiloJournalChipMeta("About a week", 0).icon).toBe("calendar-outline");
    expect(getMiloJournalChipMeta("On and off", 0).icon).toBe("calendar-outline");
    expect(getMiloJournalChipMeta("Started yesterday", 0).icon).toBe("moon-outline");
  });

  it("maps follow-up and freeform actions", () => {
    expect(getMiloJournalChipMeta("+ Add details", 0).icon).toBe("create-outline");
    expect(getMiloJournalChipMeta("Not sure", 0).icon).toBe("help-circle-outline");
    expect(getMiloJournalChipMeta("Looks right — save", 0).icon).toBe("document-text-outline");
    expect(getMiloJournalChipMeta("Nothing else", 0).icon).toBe("checkmark-circle-outline");
  });

  it("maps symptom detail answers", () => {
    expect(getMiloJournalChipMeta("Food", 0).icon).toBe("fast-food-outline");
    expect(getMiloJournalChipMeta("Yellow bile", 0).icon).toBe("color-fill-outline");
    expect(getMiloJournalChipMeta("Normal", 0).icon).toBe("checkmark-circle-outline");
    expect(getMiloJournalChipMeta("Eating less", 0).icon).toBe("restaurant-outline");
    expect(getMiloJournalChipMeta("Both", 0).icon).toBe("layers-outline");
  });

  it("uses journal-neutral fallbacks instead of starter icons", () => {
    expect(getMiloJournalChipMeta("Some unknown label", 0).icon).toBe("clipboard-outline");
    expect(getMiloJournalChipMeta("Some unknown label", 1).icon).toBe("list-outline");
  });
});
