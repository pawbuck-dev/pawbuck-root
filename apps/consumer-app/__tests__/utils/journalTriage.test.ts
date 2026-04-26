import { journalEntryNeedsTriageAttention } from "@/utils/journalTriage";

describe("journalEntryNeedsTriageAttention", () => {
  it("returns true for flagged active health entries", () => {
    expect(
      journalEntryNeedsTriageAttention({
        domain: "health",
        vet_flagged: true,
        triage_status: "active",
      })
    ).toBe(true);
  });

  it("returns false when triage is resolved", () => {
    expect(
      journalEntryNeedsTriageAttention({
        domain: "health",
        vet_flagged: true,
        triage_status: "resolved",
      })
    ).toBe(false);
  });

  it("returns false for non-health domain", () => {
    expect(
      journalEntryNeedsTriageAttention({
        domain: "behavioral",
        vet_flagged: true,
        triage_status: "active",
      })
    ).toBe(false);
  });
});
