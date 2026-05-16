import {
  buildHealthAttentionSubtitle,
  countMissingRequiredVaccines,
  countOverdueVaccinations,
} from "@/utils/healthHubAttention";

describe("countOverdueVaccinations", () => {
  it("returns 0 for empty list", () => {
    expect(countOverdueVaccinations([])).toBe(0);
  });

  it("counts rows with next_due_date in the past (latest administration per name only)", () => {
    const past = new Date();
    past.setDate(past.getDate() - 10);
    const future = new Date();
    future.setDate(future.getDate() + 30);
    expect(
      countOverdueVaccinations([
        { id: "1", name: "X", date: "2020-01-01", next_due_date: past.toISOString() },
        { id: "2", name: "Y", date: "2020-01-01", next_due_date: future.toISOString() },
        { id: "3", name: "Z", date: "2020-01-01", next_due_date: null },
      ])
    ).toBe(1);
  });

  it("does not double-count older doses of the same vaccine", () => {
    const past = new Date();
    past.setDate(past.getDate() - 60);
    expect(
      countOverdueVaccinations([
        { id: "old", name: "Rabies", date: "2020-01-01", next_due_date: past.toISOString() },
        { id: "new", name: "Rabies", date: "2021-06-01", next_due_date: past.toISOString() },
      ])
    ).toBe(1);
  });
});

describe("countMissingRequiredVaccines", () => {
  it("returns missing list length", () => {
    expect(
      countMissingRequiredVaccines({
        total: 2,
        administered: 0,
        missing: [{ id: "a" }, { id: "b" }] as never,
        administeredList: [],
      })
    ).toBe(2);
  });
});

describe("buildHealthAttentionSubtitle", () => {
  it("combines missing required and overdue", () => {
    expect(buildHealthAttentionSubtitle(2, 1)).toBe(
      "2 required vaccines missing · 1 overdue vaccine"
    );
  });
});
