import { ScheduleFrequency } from "@/constants/schedules";
import { Tables, TablesInsert } from "@/database.types";

export type MedicationSchedule =
  | {
      type: ScheduleFrequency.DAILY;
      schedules: Tables<"daily_medication_schedules">[];
    }
  | {
      type: ScheduleFrequency.WEEKLY;
      schedules: Tables<"weekly_medication_schedules">[];
    }
  | {
      type: ScheduleFrequency.MONTHLY;
      schedules: Tables<"monthly_medication_schedules">[];
    }
  | {
      type: ScheduleFrequency.AS_NEEDED;
      schedules: [];
    };

export type MedicationScheduleFormData =
  | {
      type: "Daily";
      schedules: TablesInsert<"daily_medication_schedules">[];
    }
  | {
      type: "Weekly";
      schedules: TablesInsert<"weekly_medication_schedules">[];
    }
  | {
      type: "Monthly";
      schedules: TablesInsert<"monthly_medication_schedules">[];
    }
  | { type: "As Needed"; schedules: [] };

export type MedicineData = {
  medicine: Tables<"medicines">;
  schedule: MedicationSchedule;
};

export type MedicineFormData = {
  medicine: TablesInsert<"medicines">;
  schedule: MedicationScheduleFormData;
};
