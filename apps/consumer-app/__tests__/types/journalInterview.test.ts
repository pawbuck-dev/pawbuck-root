import { parseInterviewMetadata, resolveJournalTreeId } from "@/types/journalInterview";

describe("journalInterview types", () => {
  it("resolveJournalTreeId maps walk and meal phrases", () => {
    expect(resolveJournalTreeId("After our walk")).toBe("walk_v1.5");
    expect(resolveJournalTreeId("Log a meal")).toBe("meal_v1.5");
  });

  it("parseInterviewMetadata reads structured fields", () => {
    const meta = parseInterviewMetadata({
      tree_id: "vomiting_v1.5",
      tree_version: "1.5.0",
      structured_fields: { SYMPTOM: "Vomiting" },
      turn_id: "abc",
    });
    expect(meta?.tree_id).toBe("vomiting_v1.5");
    expect(meta?.structured_fields.SYMPTOM).toBe("Vomiting");
    expect(meta?.turn_id).toBe("abc");
  });
});
