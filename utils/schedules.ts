import { DAYS_OF_WEEK, DayNumber } from "@/constants/schedules";

/**
 * Format a time string in HH:mm format to 12-hour display format
 * @param time - Time string in HH:mm format (e.g., "14:30")
 * @returns Formatted time string (e.g., "02:30 PM")
 */
export const formatTimeForDisplay = (time: string): string => {
  try {
    const [hours, minutes] = time.split(":").map(Number);

    if (isNaN(hours) || isNaN(minutes)) {
      return time;
    }

    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");

    return `${displayHours}:${displayMinutes} ${period}`;
  } catch {
    return time;
  }
};

/**
 * Convert a day number (1-7) to its name
 * @param dayNumber - Day number (1=Monday, 7=Sunday)
 * @returns Day name (e.g., "Monday")
 */
export const getDayName = (dayNumber: number): string => {
  return DAYS_OF_WEEK[dayNumber as DayNumber] || "Unknown";
};

/**
 * Validate that a day of month is valid (1-31)
 * @param day - Day of month to validate
 * @returns True if valid, false otherwise
 */
export const validateDayOfMonth = (day: number): boolean => {
  return Number.isInteger(day) && day >= 1 && day <= 31;
};

/**
 * Format a Date object to HH:mm string
 * @param date - Date object
 * @returns Time string in HH:mm format
 */
export const formatTimeToString = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};
