export enum ScheduleFrequency {
  DAILY = "Daily",
  WEEKLY = "Weekly",
  MONTHLY = "Monthly",
  AS_NEEDED = "As Needed",
}

export const DAYS_OF_WEEK = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
} as const;

export type DayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
