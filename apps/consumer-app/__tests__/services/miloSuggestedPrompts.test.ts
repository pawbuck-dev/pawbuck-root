import type { Tables } from "@/database.types";
import {
  buildMiloSuggestedPrompts,
  deriveJournalPromptTopic,
  filterJournalEntriesRecent,
  journalRecentMentionsLimping,
} from "@/services/miloSuggestedPrompts";

const vac = (overrides: Partial<Tables<"vaccinations">>): Tables<"vaccinations"> =>
  ({
    id: "1",
    pet_id: "p",
    user_id: "u",
    created_at: "2024-01-01",
    date: "2023-01-01",
    name: "Rabies",
    next_due_date: null,
    clinic_name: null,
    notes: null,
    document_url: null,
    ...overrides,
  }) as Tables<"vaccinations">;

const journal = (
  overrides: Partial<Tables<"pet_journal_entries">>
): Tables<"pet_journal_entries"> =>
  ({
    id: "j1",
    pet_id: "p",
    user_id: "u",
    created_at: "2026-04-20T12:00:00Z",
    updated_at: "2026-04-20T12:00:00Z",
    domain: "health",
    subtype: "symptom",
    entry_date: "2026-04-20",
    note: "Fine",
    linked_clinical_exam_id: null,
    triage_status: "none",
    vet_flagged: false,
    ...overrides,
  }) as Tables<"pet_journal_entries">;

describe("filterJournalEntriesRecent", () => {
  const now = new Date("2026-04-26T12:00:00Z");
  it("includes entries within window", () => {
    const rows = [
      journal({ entry_date: "2026-04-25" }),
      journal({ entry_date: "2026-04-10", id: "old" }),
    ];
    expect(filterJournalEntriesRecent(rows, 7, now)).toHaveLength(1);
  });
});

describe("journalRecentMentionsLimping", () => {
  it("detects limping in health journal", () => {
    expect(
      journalRecentMentionsLimping([
        journal({ note: "Limping after walk", subtype: "symptom", entry_date: "2026-04-24" }),
      ])
    ).toBe(true);
  });

  it("returns false when no limping", () => {
    expect(
      journalRecentMentionsLimping([journal({ note: "Ate well", subtype: "diet", entry_date: "2026-04-24" })])
    ).toBe(false);
  });
});

describe("deriveJournalPromptTopic", () => {
  it("detects limping from note", () => {
    expect(
      deriveJournalPromptTopic([
        journal({ note: "Morning limping on stairs", subtype: "symptom" }),
      ])
    ).toBe("limping");
  });

  it("falls back to health journal when no keyword", () => {
    expect(
      deriveJournalPromptTopic([
        journal({ note: "Ate well", subtype: "diet" }),
      ])
    ).toBe("health journal");
  });
});

describe("buildMiloSuggestedPrompts", () => {
  const now = new Date("2026-04-26T12:00:00Z");

  it("caps at maxCount", () => {
    const prompts = buildMiloSuggestedPrompts({
      petName: "Benji",
      vaccinations: [],
      journalEntries: [],
      maxCount: 3,
      now,
    });
    expect(prompts).toHaveLength(3);
  });

  it("lists overdue vaccines when pet has name", () => {
    const prompts = buildMiloSuggestedPrompts({
      petName: "Benji",
      vaccinations: [
        vac({
          name: "Rabies",
          next_due_date: "2026-01-01",
        }),
      ],
      journalEntries: [],
      maxCount: 6,
      now,
    });
    expect(prompts[0]).toBe(`List Benji's overdue vaccines.`);
  });

  it("prioritizes vet limping summary when journal mentions limping", () => {
    const prompts = buildMiloSuggestedPrompts({
      petName: "Benji",
      vaccinations: [],
      journalEntries: [
        journal({
          entry_date: "2026-04-24",
          note: "Limping after walk",
          subtype: "symptom",
        }),
      ],
      maxCount: 6,
      now,
    });
    expect(prompts[0]).toBe(`Summarize Benji's recent limping for the vet.`);
    expect(prompts.some((p) => p.includes("week") && p.includes("limping"))).toBe(false);
  });

  it("when limping and overdue, limping prompt comes first", () => {
    const prompts = buildMiloSuggestedPrompts({
      petName: "Benji",
      vaccinations: [vac({ name: "Rabies", next_due_date: "2026-01-01" })],
      journalEntries: [
        journal({ entry_date: "2026-04-24", note: "Limping", subtype: "symptom" }),
      ],
      maxCount: 8,
      now,
    });
    expect(prompts[0]).toContain("limping for the vet");
    expect(prompts[1]).toBe(`List Benji's overdue vaccines.`);
  });

  it("works without pet name — general list only", () => {
    const prompts = buildMiloSuggestedPrompts({
      petName: null,
      vaccinations: [],
      journalEntries: [],
      maxCount: 4,
      now,
    });
    expect(prompts.length).toBe(4);
    expect(prompts[0]).toMatch(/vet visit|unsafe|exercise/i);
  });
});
