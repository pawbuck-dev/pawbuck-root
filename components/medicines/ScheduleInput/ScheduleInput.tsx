import { ScheduleFrequency } from "@/constants/schedules";
import { TablesInsert } from "@/database.types";
import React from "react";
import DailyScheduleInput from "./DailyScheduleInput";
import MonthlyScheduleInput from "./MonthlyScheduleInput";
import WeeklyScheduleInput from "./WeeklyScheduleInput";

type ScheduleInputProps = {
  frequency: ScheduleFrequency;
  dailySchedules: TablesInsert<"daily_medication_schedules">[];
  weeklySchedules: TablesInsert<"weekly_medication_schedules">[];
  monthlySchedules: TablesInsert<"monthly_medication_schedules">[];
  onDailyChange: (
    schedules: TablesInsert<"daily_medication_schedules">[]
  ) => void;
  onWeeklyChange: (
    schedules: TablesInsert<"weekly_medication_schedules">[]
  ) => void;
  onMonthlyChange: (
    schedules: TablesInsert<"monthly_medication_schedules">[]
  ) => void;
};

const ScheduleInput = ({
  frequency,
  dailySchedules,
  weeklySchedules,
  monthlySchedules,
  onDailyChange,
  onWeeklyChange,
  onMonthlyChange,
}: ScheduleInputProps) => {
  switch (frequency) {
    case ScheduleFrequency.DAILY:
      return (
        <DailyScheduleInput
          schedules={dailySchedules}
          onChange={onDailyChange}
        />
      );

    case ScheduleFrequency.WEEKLY:
      return (
        <WeeklyScheduleInput
          schedules={weeklySchedules}
          onChange={onWeeklyChange}
        />
      );

    case ScheduleFrequency.MONTHLY:
      return (
        <MonthlyScheduleInput
          schedules={monthlySchedules}
          onChange={onMonthlyChange}
        />
      );

    case ScheduleFrequency.AS_NEEDED:
      // No schedule input for "As Needed"
      return null;

    default:
      return null;
  }
};

export default ScheduleInput;
