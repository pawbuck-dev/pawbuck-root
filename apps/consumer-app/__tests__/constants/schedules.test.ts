import {
  FREQUENCY_PICKER_ORDER,
  frequencyMenuLabel,
  ScheduleFrequency,
} from "@/constants/schedules";

describe("frequencyMenuLabel", () => {
  it("maps weekly to Twice Daily for menu copy", () => {
    expect(frequencyMenuLabel(ScheduleFrequency.WEEKLY)).toBe("Twice Daily");
  });

  it("passes through other enum labels", () => {
    expect(frequencyMenuLabel(ScheduleFrequency.DAILY)).toBe("Daily");
    expect(frequencyMenuLabel(ScheduleFrequency.MONTHLY)).toBe("Monthly");
    expect(frequencyMenuLabel(ScheduleFrequency.AS_NEEDED)).toBe("As Needed");
  });
});

describe("FREQUENCY_PICKER_ORDER", () => {
  it("matches Add Medicine / Figma menu sequence", () => {
    expect(FREQUENCY_PICKER_ORDER).toEqual([
      ScheduleFrequency.DAILY,
      ScheduleFrequency.WEEKLY,
      ScheduleFrequency.AS_NEEDED,
      ScheduleFrequency.MONTHLY,
    ]);
  });
});
