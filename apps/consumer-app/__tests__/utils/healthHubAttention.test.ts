import { countOverdueVaccinations } from "@/utils/healthHubAttention";

describe("countOverdueVaccinations", () => {
  it("returns 0 for empty list", () => {
    expect(countOverdueVaccinations([])).toBe(0);
  });

  it("counts rows with next_due_date in the past", () => {
    const past = new Date();
    past.setDate(past.getDate() - 10);
    const future = new Date();
    future.setDate(future.getDate() + 30);
    expect(
      countOverdueVaccinations([
        { next_due_date: past.toISOString() },
        { next_due_date: future.toISOString() },
        { next_due_date: null },
      ])
    ).toBe(1);
  });
});
