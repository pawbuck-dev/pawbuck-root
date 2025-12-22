import { ScheduleFrequency } from "@/constants/schedules";
import { Tables, TablesInsert } from "@/database.types";
import {
  MedicationSchedule,
  MedicationScheduleFormData,
} from "@/models/medication";
import { supabase } from "@/utils/supabase";

// Types for schedule operations
type DailySchedule = Tables<"daily_medication_schedules">;
type WeeklySchedule = Tables<"weekly_medication_schedules">;
type MonthlySchedule = Tables<"monthly_medication_schedules">;

type DailyScheduleInsert = TablesInsert<"daily_medication_schedules">;
type WeeklyScheduleInsert = TablesInsert<"weekly_medication_schedules">;
type MonthlyScheduleInsert = TablesInsert<"monthly_medication_schedules">;

// ==================== FETCH SCHEDULES ====================

/**
 * Fetch all daily schedules for a medication
 */
export const fetchDailySchedules = async (
  medicationId: string
): Promise<DailySchedule[]> => {
  const { data, error } = await supabase
    .from("daily_medication_schedules")
    .select("*")
    .eq("medication_id", medicationId)
    .order("time", { ascending: true });

  if (error) {
    console.error("Error fetching daily schedules:", error);
    throw error;
  }

  return data || [];
};

/**
 * Fetch all weekly schedules for a medication
 */
export const fetchWeeklySchedules = async (
  medicationId: string
): Promise<WeeklySchedule[]> => {
  const { data, error } = await supabase
    .from("weekly_medication_schedules")
    .select("*")
    .eq("medication_id", medicationId)
    .order("day_number", { ascending: true })
    .order("time", { ascending: true });

  if (error) {
    console.error("Error fetching weekly schedules:", error);
    throw error;
  }

  return data || [];
};

/**
 * Fetch all monthly schedules for a medication
 */
export const fetchMonthlySchedules = async (
  medicationId: string
): Promise<MonthlySchedule[]> => {
  const { data, error } = await supabase
    .from("monthly_medication_schedules")
    .select("*")
    .eq("medication_id", medicationId)
    .order("day_of_month", { ascending: true })
    .order("time", { ascending: true });

  if (error) {
    console.error("Error fetching monthly schedules:", error);
    throw error;
  }

  return data || [];
};

// ==================== FETCH USER SCHEDULES ====================

/**
 * Fetch all daily schedules for a user
 */
export const fetchUserDailySchedules = async (
  userId: string
): Promise<DailySchedule[]> => {
  const { data, error } = await supabase
    .from("daily_medication_schedules")
    .select("*")
    .eq("user_id", userId)
    .order("medication_id", { ascending: true })
    .order("time", { ascending: true });

  if (error) {
    console.error("Error fetching user daily schedules:", error);
    throw error;
  }

  return data || [];
};

/**
 * Fetch all weekly schedules for a user
 */
export const fetchUserWeeklySchedules = async (
  userId: string
): Promise<WeeklySchedule[]> => {
  const { data, error } = await supabase
    .from("weekly_medication_schedules")
    .select("*")
    .eq("user_id", userId)
    .order("medication_id", { ascending: true })
    .order("day_number", { ascending: true })
    .order("time", { ascending: true });

  if (error) {
    console.error("Error fetching user weekly schedules:", error);
    throw error;
  }

  return data || [];
};

/**
 * Fetch all monthly schedules for a user
 */
export const fetchUserMonthlySchedules = async (
  userId: string
): Promise<MonthlySchedule[]> => {
  const { data, error } = await supabase
    .from("monthly_medication_schedules")
    .select("*")
    .eq("user_id", userId)
    .order("medication_id", { ascending: true })
    .order("day_of_month", { ascending: true })
    .order("time", { ascending: true });

  if (error) {
    console.error("Error fetching user monthly schedules:", error);
    throw error;
  }

  return data || [];
};

/**
 * Fetch all schedules for a user and organize them by medication_id
 * Returns a map where keys are medication IDs and values are arrays of MedicationSchedule objects
 */
export const fetchAllUserSchedules = async (
  userId: string
): Promise<Record<string, MedicationSchedule>> => {
  // Fetch all schedule types in parallel
  const [dailySchedules, weeklySchedules, monthlySchedules] = await Promise.all(
    [
      fetchUserDailySchedules(userId),
      fetchUserWeeklySchedules(userId),
      fetchUserMonthlySchedules(userId),
    ]
  );

  // Organize schedules by medication_id
  const schedulesMap: Record<string, MedicationSchedule> = {};

  // Group daily schedules by medication_id
  dailySchedules.forEach((schedule) => {
    schedulesMap[schedule.medication_id] = {
      type: ScheduleFrequency.DAILY,
      schedules: [schedule],
    };
  });

  // Group weekly schedules by medication_id
  weeklySchedules.forEach((schedule) => {
    schedulesMap[schedule.medication_id] = {
      type: ScheduleFrequency.WEEKLY,
      schedules: [schedule],
    };
  });

  // Group monthly schedules by medication_id
  monthlySchedules.forEach((schedule) => {
    schedulesMap[schedule.medication_id] = {
      type: ScheduleFrequency.MONTHLY,
      schedules: [schedule],
    };
  });

  return schedulesMap;
};

// ==================== INSERT SCHEDULES ====================

/**
 * Insert a single daily schedule
 */
export const insertDailySchedule = async (
  schedule: DailyScheduleInsert
): Promise<DailySchedule> => {
  const { data, error } = await supabase
    .from("daily_medication_schedules")
    .insert(schedule)
    .select()
    .single();

  if (error) {
    console.error("Error inserting daily schedule:", error);
    throw error;
  }

  return data;
};

/**
 * Insert multiple daily schedules at once
 */
export const insertDailySchedules = async (
  schedules: DailyScheduleInsert[]
): Promise<DailySchedule[]> => {
  if (schedules.length === 0) return [];

  const { data, error } = await supabase
    .from("daily_medication_schedules")
    .insert(schedules)
    .select();

  if (error) {
    console.error("Error inserting daily schedules:", error);
    throw error;
  }

  return data || [];
};

/**
 * Insert a single weekly schedule
 */
export const insertWeeklySchedule = async (
  schedule: WeeklyScheduleInsert
): Promise<WeeklySchedule> => {
  const { data, error } = await supabase
    .from("weekly_medication_schedules")
    .insert(schedule)
    .select()
    .single();

  if (error) {
    console.error("Error inserting weekly schedule:", error);
    throw error;
  }

  return data;
};

/**
 * Insert multiple weekly schedules at once
 */
export const insertWeeklySchedules = async (
  schedules: WeeklyScheduleInsert[]
): Promise<WeeklySchedule[]> => {
  if (schedules.length === 0) return [];

  const { data, error } = await supabase
    .from("weekly_medication_schedules")
    .insert(schedules)
    .select();

  if (error) {
    console.error("Error inserting weekly schedules:", error);
    throw error;
  }

  return data || [];
};

/**
 * Insert a single monthly schedule
 */
export const insertMonthlySchedule = async (
  schedule: MonthlyScheduleInsert
): Promise<MonthlySchedule> => {
  const { data, error } = await supabase
    .from("monthly_medication_schedules")
    .insert(schedule)
    .select()
    .single();

  if (error) {
    console.error("Error inserting monthly schedule:", error);
    throw error;
  }

  return data;
};

/**
 * Insert multiple monthly schedules at once
 */
export const insertMonthlySchedules = async (
  schedules: MonthlyScheduleInsert[]
): Promise<MonthlySchedule[]> => {
  if (schedules.length === 0) return [];

  const { data, error } = await supabase
    .from("monthly_medication_schedules")
    .insert(schedules)
    .select();

  if (error) {
    console.error("Error inserting monthly schedules:", error);
    throw error;
  }

  return data || [];
};

// ==================== DELETE SCHEDULES ====================

/**
 * Delete a single daily schedule
 */
export const deleteDailySchedule = async (
  scheduleId: string
): Promise<void> => {
  const { error } = await supabase
    .from("daily_medication_schedules")
    .delete()
    .eq("id", scheduleId);

  if (error) {
    console.error("Error deleting daily schedule:", error);
    throw error;
  }
};

/**
 * Delete all daily schedules for a medication
 */
export const deleteDailySchedulesByMedication = async (
  medicationId: string
): Promise<void> => {
  const { error } = await supabase
    .from("daily_medication_schedules")
    .delete()
    .eq("medication_id", medicationId);

  if (error) {
    console.error("Error deleting daily schedules by medication:", error);
    throw error;
  }
};

/**
 * Delete a single weekly schedule
 */
export const deleteWeeklySchedule = async (
  scheduleId: string
): Promise<void> => {
  const { error } = await supabase
    .from("weekly_medication_schedules")
    .delete()
    .eq("id", scheduleId);

  if (error) {
    console.error("Error deleting weekly schedule:", error);
    throw error;
  }
};

/**
 * Delete all weekly schedules for a medication
 */
export const deleteWeeklySchedulesByMedication = async (
  medicationId: string
): Promise<void> => {
  const { error } = await supabase
    .from("weekly_medication_schedules")
    .delete()
    .eq("medication_id", medicationId);

  if (error) {
    console.error("Error deleting weekly schedules by medication:", error);
    throw error;
  }
};

/**
 * Delete a single monthly schedule
 */
export const deleteMonthlySchedule = async (
  scheduleId: number
): Promise<void> => {
  const { error } = await supabase
    .from("monthly_medication_schedules")
    .delete()
    .eq("id", scheduleId);

  if (error) {
    console.error("Error deleting monthly schedule:", error);
    throw error;
  }
};

/**
 * Delete all monthly schedules for a medication
 */
export const deleteMonthlySchedulesByMedication = async (
  medicationId: string
): Promise<void> => {
  const { error } = await supabase
    .from("monthly_medication_schedules")
    .delete()
    .eq("medication_id", medicationId);

  if (error) {
    console.error("Error deleting monthly schedules by medication:", error);
    throw error;
  }
};

/**
 * Delete all schedules (daily, weekly, monthly) for a medication
 * Useful when updating a medication and changing its frequency type
 */
export const deleteAllSchedulesByMedication = async (
  medicationId: string
): Promise<void> => {
  await Promise.all([
    deleteDailySchedulesByMedication(medicationId),
    deleteWeeklySchedulesByMedication(medicationId),
    deleteMonthlySchedulesByMedication(medicationId),
  ]);
};

// ==================== BULK OPERATIONS ====================

/**
 * Replace all daily schedules for a medication
 * Deletes existing schedules and inserts new ones
 */
export const replaceDailySchedules = async (
  medicationId: string,
  newSchedules: DailyScheduleInsert[]
): Promise<DailySchedule[]> => {
  await deleteAllSchedulesByMedication(medicationId);
  return insertDailySchedules(newSchedules);
};

/**
 * Replace all weekly schedules for a medication
 * Deletes existing schedules and inserts new ones
 */
export const replaceWeeklySchedules = async (
  medicationId: string,
  newSchedules: WeeklyScheduleInsert[]
): Promise<WeeklySchedule[]> => {
  await deleteAllSchedulesByMedication(medicationId);
  return insertWeeklySchedules(newSchedules);
};

/**
 * Replace all monthly schedules for a medication
 * Deletes existing schedules and inserts new ones
 */
export const replaceMonthlySchedules = async (
  medicationId: string,
  newSchedules: MonthlyScheduleInsert[]
): Promise<MonthlySchedule[]> => {
  await deleteAllSchedulesByMedication(medicationId);
  return insertMonthlySchedules(newSchedules);
};

export const updateMedicationSchedules = async (
  medicationId: string,
  schedules: MedicationScheduleFormData
): Promise<void> => {
  schedules.schedules.forEach((s) => (s.medication_id = medicationId));
  switch (schedules.frequency) {
    case ScheduleFrequency.DAILY:
      await replaceDailySchedules(medicationId, schedules.schedules);
      break;
    case ScheduleFrequency.WEEKLY:
      await replaceWeeklySchedules(medicationId, schedules.schedules);
      break;
    case ScheduleFrequency.MONTHLY:
      await replaceMonthlySchedules(medicationId, schedules.schedules);
      break;
    case ScheduleFrequency.AS_NEEDED:
      await deleteAllSchedulesByMedication(medicationId);
      break;
  }
};
