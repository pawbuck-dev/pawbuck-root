import { ScheduleFrequency } from "@/constants/schedules";
import { TablesInsert } from "@/database.types";
import {
  DailyMedicationSchedule,
  MedicineFormData,
  MonthlyMedicationSchedule,
  WeeklyMedicationSchedule,
} from "@/models/medication";

/**
 * Validation result for medication schedules
 */
export type ValidationResult = {
  isValid: boolean;
  errorMessage?: string;
};

/**
 * Schedule data structure for each medication
 */
export type MedicationScheduleData = {
  daily: DailyMedicationSchedule[];
  weekly: WeeklyMedicationSchedule[];
  monthly: MonthlyMedicationSchedule[];
};

/**
 * Validate that medications have required schedules based on their frequency
 * @param medications - Array of medication data
 * @param schedules - Array of schedule data for each medication
 * @returns Validation result with error message if invalid
 */
export const validateMedicationSchedules = (
  medications: TablesInsert<"medicines">[],
  schedules: MedicationScheduleData[]
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
 * MedicineFormData is a flat structure with all medication fields plus frequency and schedules
 * @param medications - Array of medication data
 * @param schedules - Array of schedule data for each medication
 * @param petId - The pet ID to inject into each medication (required for OCR-extracted medications)
 * @returns Array of MedicineFormData
 */
export const transformMedicationsWithSchedules = (
  medications: TablesInsert<"medicines">[],
  schedules: MedicationScheduleData[],
  petId: string
): MedicineFormData[] => {
  return medications.map((medication, index) => {
    const medicationSchedules = schedules[index] || {
      daily: [],
      weekly: [],
      monthly: [],
    };

    // Extract all medication fields except 'schedules' (which is the JSON column)
    const { schedules: _scheduleJson, ...medicationFields } = medication;

    // Base fields with pet_id injected (ensures pet_id is always set)
    const baseFields = {
      ...medicationFields,
      pet_id: petId,
    };

    if (medication.frequency === ScheduleFrequency.DAILY) {
      return {
        ...baseFields,
        frequency: ScheduleFrequency.DAILY,
        schedules: medicationSchedules.daily,
      } as MedicineFormData;
    } else if (medication.frequency === ScheduleFrequency.WEEKLY) {
      return {
        ...baseFields,
        frequency: ScheduleFrequency.WEEKLY,
        schedules: medicationSchedules.weekly,
      } as MedicineFormData;
    } else if (medication.frequency === ScheduleFrequency.MONTHLY) {
      return {
        ...baseFields,
        frequency: ScheduleFrequency.MONTHLY,
        schedules: medicationSchedules.monthly,
      } as MedicineFormData;
    } else {
      return {
        ...baseFields,
        frequency: ScheduleFrequency.AS_NEEDED,
        schedules: [],
      } as MedicineFormData;
    }
  });
};
