import { applyDismissals, isDismissalActive, snoozeUntilYmd } from "./applyDismissals";

describe("applyDismissals", () => {
  const nudges = [
    { kind: "vac_overdue", petId: "pet-1", title: "Rabies overdue" },
    { kind: "med_due_today", petId: "pet-1", title: "Med today" },
  ];

  it("filters active dismissals", () => {
    const filtered = applyDismissals(nudges, [{ pet_id: "pet-1", nudge_kind: "vac_overdue", dismissed_until: "2026-07-01" }], "2026-06-29");
    expect(filtered.map((n) => n.kind)).toEqual(["med_due_today"]);
  });

  it("ignores expired snooze", () => {
    const filtered = applyDismissals(nudges, [{ pet_id: "pet-1", nudge_kind: "vac_overdue", dismissed_until: "2026-06-20" }], "2026-06-29");
    expect(filtered).toHaveLength(2);
  });

  it("treats null dismissed_until as permanent", () => {
    expect(isDismissalActive({ pet_id: "p", nudge_kind: "k", dismissed_until: null }, "2026-06-29")).toBe(true);
  });

  it("snoozeUntilYmd adds days in UTC", () => {
    expect(snoozeUntilYmd(new Date("2026-06-29T12:00:00Z"), 7)).toBe("2026-07-06");
  });
});
