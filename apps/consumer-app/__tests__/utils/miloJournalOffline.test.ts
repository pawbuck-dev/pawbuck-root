import { extractPetLogEntry, severityFromConversationText } from "@/utils/miloTriage";
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

  it.each([
    [0, false, 4, /how long/i],
    [1, false, 4, /anything else/i],
    [2, true, 0, /All information recorded/i],
  ] as const)(
    "priorUserLineCount %i → complete=%s, chipCount=%i (matches journalMode shape)",
    (priorCount, complete, chipCount, answerPattern) => {
      const r = getOfflineJournalTurn(priorCount, "Rex");
      expect(r.journalSessionComplete).toBe(complete);
      expect(r.suggestedReplies).toHaveLength(chipCount);
      expect(r.answer).toMatch(answerPattern);
      expect(r.answer).toContain("Rex");
    }
  );

  it("clamps priorUserLineCount below 0 and above 2", () => {
    expect(getOfflineJournalTurn(-5, "A").answer).toEqual(getOfflineJournalTurn(0, "A").answer);
    expect(getOfflineJournalTurn(99, "B").answer).toEqual(getOfflineJournalTurn(2, "B").answer);
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
