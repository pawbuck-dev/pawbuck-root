import { ScheduleFrequency } from "@/constants/schedules";
import { TablesInsert } from "@/database.types";
import { MedicineFormData } from "@/models/medication";

/**
 * Validation result for medication schedules
 */
export type ValidationResult = {
  isValid: boolean;
  errorMessage?: string;
};

/**
 * Validate that medications have required schedules based on their frequency
 * @param medications - Array of medication data
 * @param schedules - Array of schedule data for each medication
 * @returns Validation result with error message if invalid
 */
export const validateMedicationSchedules = (
  medications: TablesInsert<"medicines">[],
  schedules: {
    daily: TablesInsert<"daily_medication_schedules">[];
    weekly: TablesInsert<"weekly_medication_schedules">[];
    monthly: TablesInsert<"monthly_medication_schedules">[];
  }[]
): ValidationResult => {
  for (let i = 0; i < medications.length; i++) {
    const medication = medications[i];
    const medicationSchedules = schedules[i];

    if (medication.frequency === ScheduleFrequency.DAILY) {
      if (!medicationSchedules || medicationSchedules.daily.length === 0) {
        return {
          isValid: false,
          errorMessage: `Please add at least one schedule for daily medication "${medication.name}".`,
        };
      }
    } else if (medication.frequency === ScheduleFrequency.WEEKLY) {
      if (!medicationSchedules || medicationSchedules.weekly.length === 0) {
        return {
          isValid: false,
          errorMessage: `Please add at least one schedule for weekly medication "${medication.name}".`,
        };
      }
    } else if (medication.frequency === ScheduleFrequency.MONTHLY) {
      if (!medicationSchedules || medicationSchedules.monthly.length === 0) {
        return {
          isValid: false,
          errorMessage: `Please add at least one schedule for monthly medication "${medication.name}".`,
        };
      }
    }
  }

  return { isValid: true };
};

/**
 * Transform medications and schedules data into MedicineFormData format
 * @param medications - Array of medication data
 * @param schedules - Array of schedule data for each medication
 * @returns Array of MedicineFormData
 */
export const transformMedicationsWithSchedules = (
  medications: TablesInsert<"medicines">[],
  schedules: {
    daily: TablesInsert<"daily_medication_schedules">[];
    weekly: TablesInsert<"weekly_medication_schedules">[];
    monthly: TablesInsert<"monthly_medication_schedules">[];
  }[]
): MedicineFormData[] => {
  return medications.map((medication, index) => {
    const medicationSchedules = schedules[index] || {
      daily: [],
      weekly: [],
      monthly: [],
    };

    if (medication.frequency === ScheduleFrequency.DAILY) {
      return {
        medicine: medication,
        schedule: {
          frequency: "Daily",
          schedules: medicationSchedules.daily,
        },
      };
    } else if (medication.frequency === ScheduleFrequency.WEEKLY) {
      return {
        medicine: medication,
        schedule: {
          frequency: "Weekly",
          schedules: medicationSchedules.weekly,
        },
      };
    } else if (medication.frequency === ScheduleFrequency.MONTHLY) {
      return {
        medicine: medication,
        schedule: {
          frequency: "Monthly",
          schedules: medicationSchedules.monthly,
        },
      };
    } else {
      return {
        medicine: medication,
        schedule: {
          frequency: "As Needed",
          schedules: [],
        },
      };
    }
  });
};
