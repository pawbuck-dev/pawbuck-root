import { getOfflineJournalTurn } from "@/utils/miloJournalOffline";

describe("getOfflineJournalTurn", () => {
  it("first turn asks duration with chips", () => {
    const r = getOfflineJournalTurn(0, "Benji");
    expect(r.journalSessionComplete).toBe(false);
    expect(r.suggestedReplies).toHaveLength(4);
    expect(r.answer).toContain("Benji");
    expect(r.answer).toMatch(/how long/i);
  });

  it("second turn asks follow-up", () => {
    const r = getOfflineJournalTurn(1, "Luna");
    expect(r.journalSessionComplete).toBe(false);
    expect(r.suggestedReplies.length).toBeGreaterThan(0);
  });

  it("third turn completes with no chips", () => {
    const r = getOfflineJournalTurn(2, "Luna");
    expect(r.journalSessionComplete).toBe(true);
    expect(r.suggestedReplies).toHaveLength(0);
  });
});
