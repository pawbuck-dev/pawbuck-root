import { extractPetLogEntry, severityFromConversationText } from "@/utils/miloTriage";
import { getOfflineJournalTurn } from "@/utils/miloJournalOffline";

describe("getOfflineJournalTurn", () => {
  it("first turn asks duration with chips", () => {
    const r = getOfflineJournalTurn(0, "Benji", "vomiting");
    expect(r.journalSessionComplete).toBe(false);
    expect(r.suggestedReplies.length).toBeGreaterThanOrEqual(4);
    expect(r.suggestedReplies).toContain("Not sure");
    expect(r.answer).toContain("Benji");
  });

  it("second turn asks follow-up", () => {
    const r = getOfflineJournalTurn(1, "Luna");
    expect(r.journalSessionComplete).toBe(false);
    expect(r.suggestedReplies.length).toBeGreaterThan(0);
  });

  it("vomiting tree completes after appetite step", () => {
    const r = getOfflineJournalTurn(3, "Luna", "vomiting");
    expect(r.journalSessionComplete).toBe(true);
    expect(r.structuredFields?.SYMPTOM).toBeDefined();
  });

  it("generic flow completes on third turn", () => {
    const r = getOfflineJournalTurn(2, "Rex", "something vague");
    expect(r.journalSessionComplete).toBe(true);
    expect(r.suggestedReplies).toHaveLength(0);
  });
});

describe("offline journal multi-turn triage (userTurns order)", () => {
  it("preserves chronological lines in join for triage source (persistJournalEntry contract)", () => {
    const userTurns = ["Milo is happy today", "still playful", "now bleeding from the paw"];
    const combined = userTurns.join("\n");
    expect(combined).toBe("Milo is happy today\nstill playful\nnow bleeding from the paw");
    expect(severityFromConversationText(userTurns)).toBe("urgent");

    const entry = extractPetLogEntry(
      "API summary unavailable",
      "pet-1",
      "user-1",
      "health",
      undefined,
      combined
    );
    expect(entry.severity).toBe("urgent");
    expect(entry.vet_flag).toBe(true);
    expect(entry.note).toBe("API summary unavailable");
  });

  it("three benign turns stay non-urgent", () => {
    const userTurns = ["great mood", "ate normally", "slept well"];
    expect(severityFromConversationText(userTurns)).toBe("low");
    const entry = extractPetLogEntry("offline", "p", "u", "health", undefined, userTurns.join("\n"));
    expect(entry.severity).toBe("low");
    expect(entry.vet_flag).toBe(false);
  });
});
