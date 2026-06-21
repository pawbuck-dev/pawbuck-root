import { shouldShowStructuredSummaryCard } from "@/utils/miloJournalUi";

describe("shouldShowStructuredSummaryCard", () => {
  const draft = {
    role: "assistant" as const,
    interviewPhase: "summary_draft" as const,
    structuredSummary: { fields: { SYMPTOM: "Vomit" } },
  };

  it("shows draft when it is the only summary_draft", () => {
    expect(shouldShowStructuredSummaryCard(draft, 0, [draft])).toBe(true);
  });

  it("hides draft after a later journalSessionComplete message", () => {
    const complete = {
      role: "assistant" as const,
      journalSessionComplete: true,
    };
    expect(shouldShowStructuredSummaryCard(draft, 0, [draft, complete])).toBe(false);
  });

  it("hides older draft when a newer draft exists", () => {
    const newerDraft = { ...draft };
    expect(shouldShowStructuredSummaryCard(draft, 0, [draft, newerDraft])).toBe(false);
    expect(shouldShowStructuredSummaryCard(newerDraft, 1, [draft, newerDraft])).toBe(true);
  });

  it("returns false for user messages", () => {
    expect(
      shouldShowStructuredSummaryCard({ role: "user" }, 0, [{ role: "user" }])
    ).toBe(false);
  });
});
