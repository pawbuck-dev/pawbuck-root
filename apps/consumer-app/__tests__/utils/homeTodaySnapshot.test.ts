import { buildHomeTodaySnapshot, buildTopCatchUpPriority } from "@/utils/homeTodaySnapshot";

describe("buildTopCatchUpPriority", () => {
  it("returns the nearest upcoming vaccination", () => {
    const priority = buildTopCatchUpPriority({
      petId: "pet-1",
      petCountry: "United States",
      vaccinations: [
        {
          id: "v1",
          name: "DHPP",
          date: "2025-01-01",
          next_due_date: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
        },
      ],
      medicines: [],
    });

    expect(priority?.title).toContain("DHPP");
    expect(priority?.route).toContain("vaccinations");
  });
});

describe("buildHomeTodaySnapshot", () => {
  it("reports all clear when nothing needs attention", () => {
    const snapshot = buildHomeTodaySnapshot({
      petId: "pet-1",
      vaccinations: [],
      medicines: [],
      vetFlaggedCount: 0,
      categories: [
        { key: "weight", ok: true },
        { key: "allergies", ok: true },
        { key: "vaccines", ok: true },
        { key: "meds", ok: true },
      ],
    });

    expect(snapshot.statusLabel).toBe("All clear today — add a note anytime");
    expect(snapshot.statusTone).toBe("ok");
    expect(snapshot.priority).toBeNull();
    expect(snapshot.careNudges).toEqual([]);
  });

  it("counts briefing attention items", () => {
    const snapshot = buildHomeTodaySnapshot({
      petId: "pet-1",
      vaccinations: [],
      medicines: [],
      vetFlaggedCount: 1,
      categories: [
        { key: "weight", ok: false },
        { key: "allergies", ok: true },
        { key: "vaccines", ok: true },
        { key: "meds", ok: true },
      ],
    });

    expect(snapshot.attentionCount).toBe(2);
    expect(snapshot.statusTone).toBe("attention");
  });
});
