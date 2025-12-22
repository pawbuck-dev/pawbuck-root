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
      frequency: "Daily";
      schedules: TablesInsert<"daily_medication_schedules">[];
    }
  | {
      frequency: "Weekly";
      schedules: TablesInsert<"weekly_medication_schedules">[];
    }
  | {
      frequency: "Monthly";
      schedules: TablesInsert<"monthly_medication_schedules">[];
    }
  | { frequency: "As Needed"; schedules: [] };

export type MedicineData = {
  medicine: Tables<"medicines">;
  schedule: MedicationSchedule;
};

export type MedicineFormData = {
  medicine: TablesInsert<"medicines">;
  schedule: MedicationScheduleFormData;
};
