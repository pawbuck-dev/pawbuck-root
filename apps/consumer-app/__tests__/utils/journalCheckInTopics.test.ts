import type { PetJournalEntry } from "@/services/petJournal";
import {
  ALL_GOOD_TODAY_CHIP,
  buildAllGoodTodayOfflineSummary,
  buildJournalCheckInTopicReplies,
  getRecentIssueJournalEntries,
  shouldOfferAllGoodTodayChip,
} from "@/utils/journalCheckInTopics";

function journalEntry(overrides: Partial<PetJournalEntry>): PetJournalEntry {
  return {
    id: "j1",
    pet_id: "p1",
    user_id: "u1",
    domain: "health",
    subtype: "symptom",
    note: "Vomiting",
    entry_date: "2026-06-12",
    vet_flagged: false,
    created_at: "2026-06-12T12:00:00Z",
    updated_at: "2026-06-12T12:00:00Z",
    triage_status: null,
    milo_idempotency_key: null,
    interview_metadata: null,
    ...overrides,
  } as PetJournalEntry;
}

describe("journalCheckInTopics", () => {
  const now = new Date("2026-06-13T12:00:00");

  it("omits all good chip without prior issue entries", () => {
    expect(shouldOfferAllGoodTodayChip([], now)).toBe(false);
    expect(buildJournalCheckInTopicReplies([], now)).not.toContain(ALL_GOOD_TODAY_CHIP);
  });

  it("includes all good chip after a prior-day symptom", () => {
    const entries = [
      journalEntry({ note: "Vomiting twice", entry_date: "2026-06-12" }),
    ];
    expect(shouldOfferAllGoodTodayChip(entries, now)).toBe(true);
    expect(buildJournalCheckInTopicReplies(entries, now)[0]).toBe(ALL_GOOD_TODAY_CHIP);
  });

  it("builds recovery summary with tracked duration", () => {
    const issues = getRecentIssueJournalEntries(
      [
        journalEntry({ note: "Limping", entry_date: "2026-06-11" }),
        journalEntry({ note: "Still limping", entry_date: "2026-06-12" }),
      ],
      now
    );
    const recovery = buildAllGoodTodayOfflineSummary("Milo", issues, now);
    expect(recovery.summary).toContain("back to normal");
    expect(recovery.summary).toContain("3 days");
    expect(recovery.structuredFields.STATUS).toBe("Resolved");
  });
});
