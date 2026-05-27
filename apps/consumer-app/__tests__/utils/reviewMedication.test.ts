import { ScheduleFrequency } from "@/constants/schedules";
import {
  transformMedicationsWithSchedules,
  validateMedicationSchedules,
} from "@/utils/reviewMedication";

describe("reviewMedication", () => {
  it("validateMedicationSchedules requires daily schedule", () => {
    const meds = [{ name: "Apoquel", frequency: ScheduleFrequency.DAILY, pet_id: "p1" }];
    const result = validateMedicationSchedules(meds as any, [{ daily: [], weekly: [], monthly: [] }]);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain("Apoquel");
  });

  it("validateMedicationSchedules passes with schedule", () => {
    const meds = [{ name: "Apoquel", frequency: ScheduleFrequency.DAILY, pet_id: "p1" }];
    const result = validateMedicationSchedules(meds as any, [
      { daily: [{ time: "08:00" }], weekly: [], monthly: [] },
    ]);
    expect(result.isValid).toBe(true);
  });

  it("transformMedicationsWithSchedules injects pet_id and daily schedules", () => {
    const meds = [{ name: "Rx", frequency: ScheduleFrequency.DAILY }];
    const out = transformMedicationsWithSchedules(
      meds as any,
      [{ daily: [{ time: "09:00" }], weekly: [], monthly: [] }],
      "pet-42"
    );
    expect(out[0].pet_id).toBe("pet-42");
    expect(out[0].frequency).toBe(ScheduleFrequency.DAILY);
    expect(out[0].schedules).toHaveLength(1);
  });
});
