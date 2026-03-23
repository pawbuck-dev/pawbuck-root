import { ScheduleFrequency } from "@/constants/schedules";
import { Tables, TablesInsert } from "@/database.types";

export type DailyMedicationSchedule = {
  time: string;
};

export type WeeklyMedicationSchedule = {
  day_of_week: number;
  time: string;
};

export type MonthlyMedicationSchedule = {
  day_of_month: number;
  time: string;
};

export type MedicationSchedule =
  | {
      frequency: ScheduleFrequency.DAILY;
      schedules: DailyMedicationSchedule[];
    }
  | {
      frequency: ScheduleFrequency.WEEKLY;
      schedules: WeeklyMedicationSchedule[];
    }
  | {
      frequency: ScheduleFrequency.MONTHLY;
      schedules: MonthlyMedicationSchedule[];
    }
  | {
      frequency: ScheduleFrequency.AS_NEEDED;
      schedules: [];
    };

export type MedicineData = Omit<Tables<"medicines">, "schedules"> &
  MedicationSchedule;

export type MedicineFormData = Omit<TablesInsert<"medicines">, "schedules"> &
  MedicationSchedule;
