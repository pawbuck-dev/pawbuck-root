import moment from "moment";

/**
 * Formats a date to MM/DD/YYYY format
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) {
    return "-";
  }
  return moment(date).format("MM/DD/YYYY");
};

/**
 * Formats a date to HH:mm format (12-hour format)
 */
export const formatTime = (date: Date | string): string => {
  return moment(date).format("hh:mm A");
};

/**
 * Formats a date to display format with relative dates (Today, Tomorrow) or short date
 */
export const formatDateWithRelative = (
  date: Date | string,
  includeYear: boolean = false,
  includeTime: boolean = false
): string => {
  const targetMoment = moment(date);
  const now = moment().startOf("day");
  const target = moment(date).startOf("day");

  if (target.isSame(now, "day")) return "Today at " + formatTime(date);
  if (target.isSame(moment(now).add(1, "day"), "day"))
    return "Tomorrow at " + formatTime(date);

  const formatString = includeYear ? "MMM D, YYYY" : "MMM D";
  if (includeTime) {
    return targetMoment.format(formatString + " hh:mm A");
  }
  return targetMoment.format(formatString);
};

/**
 * Checks if a date is in the past (before today)
 */
export const isPastDate = (date: Date | string): boolean => {
  return moment(date).isBefore(moment().startOf("day"));
};

/**
 * Checks if a date is today
 */
export const isToday = (date: Date | string): boolean => {
  return moment(date).isSame(moment(), "day");
};

/**
 * Checks if a date is in the future (after today)
 */
export const isFutureDate = (date: Date | string): boolean => {
  return moment(date).isAfter(moment().startOf("day"));
};

/**
 * Gets the start of today (00:00:00)
 */
export const getStartOfToday = (): Date => {
  return moment().startOf("day").toDate();
};

/**
 * Gets the end of today (23:59:59.999)
 */
export const getEndOfToday = (): Date => {
  return moment().endOf("day").toDate();
};

/**
 * Sets time on a date from a time string (HH:mm format)
 */
export const setTimeOnDate = (date: Date, timeString: string): Date => {
  const [hours, minutes] = timeString.split(":");
  return moment(date)
    .hours(parseInt(hours, 10))
    .minutes(parseInt(minutes, 10))
    .seconds(0)
    .milliseconds(0)
    .toDate();
};

/**
 * Converts time string (HH:mm) to total minutes
 */
export const timeStringToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(":");
  return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
};

/**
 * Gets current time in minutes since midnight
 */
export const getCurrentTimeInMinutes = (): number => {
  return moment().hours() * 60 + moment().minutes();
};

/**
 * Sorts dates in ascending order
 */
export const sortDatesAsc = (dates: Date[]): Date[] => {
  return dates.sort((a, b) => moment(a).diff(moment(b)));
};

/**
 * Gets the earliest date from an array of dates
 */
export const getEarliestDate = (dates: Date[]): Date | null => {
  if (dates.length === 0) return null;
  return sortDatesAsc([...dates])[0];
};
