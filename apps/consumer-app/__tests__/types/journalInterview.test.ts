import { isEditSummaryIntent, resolveContextSurfaceJournalAction } from "@/types/journalInterview";

describe("resolveContextSurfaceJournalAction", () => {
  const surface = {
    lines: [],
    actions: [
      { id: "context_continue", label: "Looks right — continue" },
      { id: "add_medication", label: "Add a medication" },
      { id: "add_vaccines", label: "Update vaccines" },
    ],
  };

  it("maps action labels to ids", () => {
    expect(resolveContextSurfaceJournalAction("Update vaccines", surface)).toBe("add_vaccines");
    expect(resolveContextSurfaceJournalAction("Add a medication", surface)).toBe("add_medication");
  });

  it("maps context_continue label", () => {
    expect(resolveContextSurfaceJournalAction("Looks right — continue", surface)).toBe(
      "context_continue"
    );
  });
});

describe("isEditSummaryIntent", () => {
  it("detects edit chip and typed replies", () => {
    expect(isEditSummaryIntent("Edit a field")).toBe(true);
    expect(isEditSummaryIntent("Edit summary")).toBe(true);
    expect(isEditSummaryIntent("edit the note")).toBe(true);
  });

  it("does not treat save as edit", () => {
    expect(isEditSummaryIntent("Looks right — save")).toBe(false);
  });
});
