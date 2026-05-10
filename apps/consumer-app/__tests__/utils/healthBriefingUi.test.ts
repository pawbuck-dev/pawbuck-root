import type { Tables } from "@/database.types";
import type { MedicineData } from "@/types/medication";
import { ScheduleFrequency } from "@/constants/schedules";
import {
  computeBriefingCategorySignals,
  formatHealthBriefingSubtitle,
  medsScheduleStatusOk,
  vaccinesStatusOk,
} from "@/utils/healthBriefingUi";

describe("formatHealthBriefingSubtitle", () => {
  it("joins pet name, weight, allergies, conditions", () => {
    expect(
      formatHealthBriefingSubtitle({
        petName: "Luna",
        weightValue: 78,
        weightUnit: "lbs",
        allergiesCount: 2,
        activeConditionsCount: 1,
      })
    ).toBe("Luna · 78.0 lbs · 2 allergies · 1 condition");
  });

  it("omits weight when missing", () => {
    expect(
      formatHealthBriefingSubtitle({
        petName: "Luna",
        weightValue: null,
        weightUnit: "lbs",
        allergiesCount: 0,
        activeConditionsCount: 0,
      })
    ).toBe("Luna");
  });
});

describe("vaccinesStatusOk", () => {
  it("is false when any next_due_date is before today", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const vacs: Pick<Tables<"vaccinations">, "next_due_date">[] = [
      { next_due_date: yesterday.toISOString().slice(0, 10) },
    ];
    expect(vaccinesStatusOk(vacs)).toBe(false);
  });

  it("is true when no overdue dates", () => {
    const next = new Date();
    next.setDate(next.getDate() + 30);
    const vacs: Pick<Tables<"vaccinations">, "next_due_date">[] = [
      { next_due_date: next.toISOString().slice(0, 10) },
    ];
    expect(vaccinesStatusOk(vacs)).toBe(true);
  });
});

describe("medsScheduleStatusOk", () => {
  it("is true for empty list", () => {
    expect(medsScheduleStatusOk([])).toBe(true);
  });

  it("is true for as-needed med with no schedule pressure", () => {
    const med = {
      frequency: ScheduleFrequency.AS_NEEDED,
      schedules: [],
    } as MedicineData;
    expect(medsScheduleStatusOk([med])).toBe(true);
  });
});

describe("computeBriefingCategorySignals", () => {
  it("marks weight not ok when missing", () => {
    const sigs = computeBriefingCategorySignals({
      weightValue: null,
      allergiesCount: 0,
      vaccinations: [],
      medicines: [],
    });
    expect(sigs.find((s) => s.key === "weight")?.ok).toBe(false);
  });

  it("marks allergies not ok when present", () => {
    const sigs = computeBriefingCategorySignals({
      weightValue: 10,
      allergiesCount: 2,
      vaccinations: [],
      medicines: [],
    });
    expect(sigs.find((s) => s.key === "allergies")?.ok).toBe(false);
  });
});
