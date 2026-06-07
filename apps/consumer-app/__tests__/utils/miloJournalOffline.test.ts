import { extractPetLogEntry, severityFromConversationText } from "@/utils/miloTriage";
import { getOfflineJournalTurn } from "@/utils/miloJournalOffline";

describe("getOfflineJournalTurn", () => {
  it("logs meal on first turn without symptom duration chips", () => {
    const r = getOfflineJournalTurn(["Log 2 bowls of food for Milo"], "Milo");
    expect(r.journalSessionComplete).toBe(true);
    expect(r.answer).toContain("meal");
    expect(r.answer).not.toContain("How long has this been going on");
    expect(r.suggestedReplies).toHaveLength(0);
    expect(r.structuredFields?.TYPE).toBe("Diet");
  });

  it("logs water on first turn without symptom duration chips", () => {
    const r = getOfflineJournalTurn(["Log 2 glasses of water"], "Milo");
    expect(r.journalSessionComplete).toBe(true);
    expect(r.answer).toContain("water");
    expect(r.answer).not.toContain("How long has this been going on");
    expect(r.structuredFields?.TYPE).toBe("Hydration");
  });

  it("first turn for vomiting asks duration with chips", () => {
    const r = getOfflineJournalTurn(["Milo is vomiting"], "Benji");
    expect(r.journalSessionComplete).toBe(false);
    expect(r.suggestedReplies.length).toBeGreaterThanOrEqual(4);
    expect(r.suggestedReplies).toContain("Not sure");
    expect(r.answer).toContain("Benji");
  });

  it("second turn asks follow-up for generic symptom", () => {
    const r = getOfflineJournalTurn(["something vague", "a couple of days"], "Luna");
    expect(r.journalSessionComplete).toBe(false);
    expect(r.suggestedReplies.length).toBeGreaterThan(0);
  });

  it("vomiting tree completes after appetite step", () => {
    const r = getOfflineJournalTurn(
      ["vomiting", "Just today", "Food", "Normal"],
      "Luna"
    );
    expect(r.journalSessionComplete).toBe(true);
    expect(r.structuredFields?.SYMPTOM).toBeDefined();
  });

  it("check-in start asks what to note, not symptom duration", () => {
    const r = getOfflineJournalTurn(["start_checkin"], "Milo");
    expect(r.journalSessionComplete).toBe(false);
    expect(r.answer).toContain("note about Milo");
    expect(r.answer).not.toContain("How long has this been going on");
    expect(r.suggestedReplies).toContain("All good today");
  });

  it("eye or ear chip starts eye/ear offline flow, not generic duration", () => {
    const r = getOfflineJournalTurn(["Eye or ear issue"], "Milo");
    expect(r.journalSessionComplete).toBe(false);
    expect(r.answer).toContain("eye or ear");
    expect(r.suggestedReplies).toContain("Eye");
    expect(r.answer).not.toContain("How long has this been going on");
  });

  it("generic flow completes on third turn", () => {
    const r = getOfflineJournalTurn(["something vague", "a couple of days", "Nothing else"], "Rex");
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

  it("routine meal log is low severity", () => {
    const userTurns = ["Log 2 glasses of water"];
    expect(severityFromConversationText(userTurns)).toBe("low");
    const entry = extractPetLogEntry("offline", "p", "u", "health", undefined, userTurns.join("\n"));
    expect(entry.severity).toBe("low");
    expect(entry.subtype).toBe("other");
    expect(entry.vet_flag).toBe(false);
  });

  it("three benign turns stay non-urgent", () => {
    const userTurns = ["great mood", "ate normally", "slept well"];
    expect(severityFromConversationText(userTurns)).toBe("low");
    const entry = extractPetLogEntry("offline", "p", "u", "health", undefined, userTurns.join("\n"));
    expect(entry.severity).toBe("low");
    expect(entry.vet_flag).toBe(false);
  });
});
