import { ScheduleFrequency } from "@/constants/schedules";
import {
  DailyMedicationSchedule,
  MedicationSchedule,
  MonthlyMedicationSchedule,
  WeeklyMedicationSchedule,
} from "@/models/medication";
import React from "react";
import DailyScheduleInput from "./DailyScheduleInput";
import MonthlyScheduleInput from "./MonthlyScheduleInput";
import WeeklyScheduleInput from "./WeeklyScheduleInput";

type ScheduleInputProps = {
  schedules: MedicationSchedule;
  onChange: (
    schedules:
      | DailyMedicationSchedule[]
      | WeeklyMedicationSchedule[]
      | MonthlyMedicationSchedule[]
  ) => void;
};

const ScheduleInput = ({ schedules, onChange }: ScheduleInputProps) => {
  switch (schedules.frequency) {
    case ScheduleFrequency.DAILY:
      return (
        <DailyScheduleInput
          schedules={schedules.schedules}
          onChange={onChange}
        />
      );

    case ScheduleFrequency.WEEKLY:
      return (
        <WeeklyScheduleInput
          schedules={schedules.schedules}
          onChange={onChange}
        />
      );

    case ScheduleFrequency.MONTHLY:
      return (
        <MonthlyScheduleInput
          schedules={schedules.schedules}
          onChange={onChange}
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
