export enum ScheduleFrequency {
  DAILY = "Daily",
  WEEKLY = "Weekly",
  MONTHLY = "Monthly",
  AS_NEEDED = "As Needed",
}

/** Picker order — matches Add Medicine / Figma frequency menu */
export const FREQUENCY_PICKER_ORDER: ScheduleFrequency[] = [
  ScheduleFrequency.DAILY,
  ScheduleFrequency.WEEKLY,
  ScheduleFrequency.AS_NEEDED,
  ScheduleFrequency.MONTHLY,
];

/** Menu label (e.g. Figma shows “Twice Daily” for weekly schedules) */
export function frequencyMenuLabel(f: ScheduleFrequency): string {
  if (f === ScheduleFrequency.WEEKLY) return "Twice Daily";
  return f;
}

export const DAYS_OF_WEEK = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
} as const;

export type DayNumber = keyof typeof DAYS_OF_WEEK;
