import { buildCareNudges } from "./buildCareNudges";

describe("buildCareNudges", () => {
  const petId = "pet-milo";
  const now = new Date("2026-06-29T12:00:00");

  it("includes overdue and due-soon vaccines on latest row per name only", () => {
    const nudges = buildCareNudges({
      petId,
      petName: "Milo",
      petCountry: "US",
      now,
      vaccinations: [
        {
          id: "old-rabies",
          name: "Rabies",
          date: "2020-01-01",
          next_due_date: "2024-01-01",
        },
        {
          id: "new-rabies",
          name: "Rabies",
          date: "2024-06-01",
          next_due_date: "2026-07-15",
        },
        {
          id: "dapp",
          name: "DAPP",
          date: "2025-10-11",
          next_due_date: "2026-06-20",
        },
      ],
      medications: [],
    });

    const kinds = nudges.map((n) => n.kind);
    expect(kinds).toContain("vac_overdue");
    expect(kinds).toContain("vac_due_soon");
    expect(nudges.find((n) => n.kind === "vac_overdue")?.evidence?.id).toBe("dapp");
    expect(nudges.some((n) => n.evidence?.id === "old-rabies")).toBe(false);
  });

  it("adds missing required in-app nudges without administered proof inference", () => {
    const nudges = buildCareNudges({
      petId,
      petName: "Milo",
      now,
      vaccinations: [],
      medications: [],
      missingRequired: [{ canonicalKey: "rabies", vaccineName: "Rabies" }],
    });

    expect(nudges).toHaveLength(1);
    expect(nudges[0].kind).toBe("vac_missing_required");
    expect(nudges[0].channels).not.toContain("push");
  });

  it("does not create vaccination nudge when only next due with no overdue row", () => {
    const nudges = buildCareNudges({
      petId,
      now,
      vaccinations: [],
      medications: [],
    });
    expect(nudges).toHaveLength(0);
  });
});
