import { ScheduleFrequency } from "@/constants/schedules";
import { MedicineData } from "@/models/medication";
import moment from "moment";
import {
  getCurrentTimeInMinutes,
  getEarliestDate,
  setTimeOnDate,
  timeStringToMinutes,
} from "./dates";

// Helper function to format time for display (24h to 12h)
export const formatTimeForDisplay = (time: string | null): string => {
  if (!time) return "Select time";
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

// Helper function to convert Date to 24h time string
export const dateToTimeString = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

// Helper function to convert 24h time string to Date
export const timeStringToDate = (time: string | null): Date => {
  const date = new Date();
  if (time) {
    const [hours, minutes] = time.split(":");
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  }
  return date;
};

/**
 * Checks if a medication has been completed (end date has passed)
 */
export const isMedicationCompleted = (medicine: MedicineData): boolean => {
  if (!medicine.end_date) return false;
  return moment(medicine.end_date).endOf("day").isBefore(moment());
};

/**
 * Checks if medication is within its active date range
 */
const isMedicationActive = (
  medicine: MedicineData,
  now: moment.Moment
): boolean => {
  if (medicine.start_date) {
    const startDate = moment(medicine.start_date).startOf("day");
    if (now.isBefore(startDate)) {
      return false;
    }
  }

  if (medicine.end_date) {
    const endDate = moment(medicine.end_date).endOf("day");
    if (now.isAfter(endDate)) {
      return false;
    }
  }

  return true;
};

/**
 * Calculates the next dose time for daily frequency medications
 */
const getNextDailyDose = (
  medicine: MedicineData,
  now: moment.Moment
): Date | null => {
  const currentTimeMinutes = getCurrentTimeInMinutes();
  const schedules = medicine.schedules;

  // Check if there's a dose later today
  for (const schedule of schedules) {
    const timeMinutes = timeStringToMinutes(schedule.time);

    if (timeMinutes > currentTimeMinutes) {
      return setTimeOnDate(now.toDate(), schedule.time);
    }
  }

  // No more doses today, return first dose tomorrow
  const tomorrow = moment(now).add(1, "day").toDate();
  return setTimeOnDate(tomorrow, schedules[0].time);
};

/**
 * Calculates the next dose time for weekly frequency medications
 */
const getNextWeeklyDose = (
  medicine: MedicineData & { frequency: ScheduleFrequency.WEEKLY },
  now: moment.Moment
): Date | null => {
  const currentTimeMinutes = getCurrentTimeInMinutes();
  const currentDay = now.day();
  const futureDoses: Date[] = [];

  for (const schedule of medicine.schedules) {
    const targetDay = schedule.day_of_week;
    const timeMinutes = timeStringToMinutes(schedule.time);

    // Check if it's today and there's time left
    if (targetDay === currentDay && timeMinutes > currentTimeMinutes) {
      const nextDose = setTimeOnDate(now.toDate(), schedule.time);
      futureDoses.push(nextDose);
    } else {
      // Calculate next occurrence of this day
      let daysUntil = targetDay - currentDay;
      if (
        daysUntil <= 0 ||
        (daysUntil === 0 && timeMinutes <= currentTimeMinutes)
      ) {
        daysUntil += 7;
      }

      const nextDate = moment(now).add(daysUntil, "days").toDate();
      const nextDose = setTimeOnDate(nextDate, schedule.time);
      futureDoses.push(nextDose);
    }
  }

  return getEarliestDate(futureDoses);
};

/**
 * Calculates the next dose time for monthly frequency medications
 */
const getNextMonthlyDose = (
  medicine: MedicineData & { frequency: ScheduleFrequency.MONTHLY },
  now: moment.Moment
): Date | null => {
  const currentTimeMinutes = getCurrentTimeInMinutes();
  const currentDate = now.date();
  const futureDoses: Date[] = [];

  for (const schedule of medicine.schedules) {
    const targetDay = schedule.day_of_month;
    const timeMinutes = timeStringToMinutes(schedule.time);

    // Check if it's today and there's time left
    if (targetDay === currentDate && timeMinutes > currentTimeMinutes) {
      const nextDose = setTimeOnDate(now.toDate(), schedule.time);
      futureDoses.push(nextDose);
    } else {
      // Calculate next occurrence of this day of month
      let nextMoment = moment(now);
      if (
        currentDate >= targetDay ||
        (targetDay === currentDate && timeMinutes <= currentTimeMinutes)
      ) {
        nextMoment = nextMoment.add(1, "month");
      }
      nextMoment = nextMoment.date(targetDay);
      const nextDose = setTimeOnDate(nextMoment.toDate(), schedule.time);
      futureDoses.push(nextDose);
    }
  }

  return getEarliestDate(futureDoses);
};

/**
 * Gets the next medication dose date and time for a given medicine
 * Returns null if medication is "As Needed", has no schedules, or is outside its date range
 */
export const getNextMedicationDose = (medicine: MedicineData): Date | null => {
  const now = moment();
  const { frequency, schedules, start_date } = medicine;

  // As Needed medications don't have scheduled doses
  if (frequency === ScheduleFrequency.AS_NEEDED) return null;

  // No schedules defined
  if (schedules.length === 0) return null;

  // Check if medication is active (within start/end date range)
  if (!isMedicationActive(medicine, now)) {
    // If start date is in the future, return the first dose on start date
    if (start_date) {
      const startDate = moment(start_date).startOf("day");
      if (now.isBefore(startDate)) {
        return setTimeOnDate(startDate.toDate(), schedules[0].time);
      }
    }
    return null;
  }

  // Calculate next dose based on frequency
  switch (frequency) {
    case ScheduleFrequency.DAILY:
      return getNextDailyDose(medicine, now);

    case ScheduleFrequency.WEEKLY:
      return getNextWeeklyDose(
        medicine as MedicineData & { frequency: ScheduleFrequency.WEEKLY },
        now
      );

    case ScheduleFrequency.MONTHLY:
      return getNextMonthlyDose(
        medicine as MedicineData & { frequency: ScheduleFrequency.MONTHLY },
        now
      );

    default:
      return null;
  }
};

/**
 * Gets the nearest medication dose from a list of medicines
 * Returns the medicine and its next dose time, or null if no upcoming doses
 */
export const getNearestMedicationDose = (
  medicines: MedicineData[]
): { medicine: MedicineData; nextDose: Date } | null => {
  let nearest: { medicine: MedicineData; nextDose: Date } | null = null;

  for (const medicine of medicines) {
    if (isMedicationCompleted(medicine)) continue;

    const nextDose = getNextMedicationDose(medicine);
    if (nextDose) {
      if (!nearest || moment(nextDose).isBefore(moment(nearest.nextDose))) {
        nearest = { medicine, nextDose };
      }
    }
  }

  return nearest;
};
