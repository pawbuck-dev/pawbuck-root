import { ScheduleFrequency } from "@/constants/schedules";

export const formatDayOfMonth = (day: number): string => {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
};

// Helper function to check if frequency requires day of week
export const requiresDayOfWeek = (frequency: ScheduleFrequency): boolean => {
  return frequency === ScheduleFrequency.WEEKLY;
};

// Helper function to check if frequency requires day of month
export const requiresDayOfMonth = (frequency: ScheduleFrequency): boolean => {
  return frequency === ScheduleFrequency.MONTHLY;
};

// Helper function to check if frequency requires scheduled time
export const requiresScheduledTime = (
  frequency: ScheduleFrequency
): boolean => {
  return frequency !== ScheduleFrequency.AS_NEEDED;
};

// Helper function to get time slot labels based on frequency
export const getTimeSlotLabels = (frequency: ScheduleFrequency): string[] => {
  switch (frequency) {
    case ScheduleFrequency.TWICE_DAILY:
      return ["Morning Dose", "Evening Dose"];
    case ScheduleFrequency.THREE_TIMES_DAILY:
      return ["Morning Dose", "Afternoon Dose", "Evening Dose"];
    case ScheduleFrequency.AS_NEEDED:
      return []; // No scheduled times for "As Needed"
    default:
      return ["Dose Time"];
  }
};

// Helper function to get number of time slots based on frequency
export const getTimeSlotCount = (frequency: ScheduleFrequency): number => {
  switch (frequency) {
    case ScheduleFrequency.TWICE_DAILY:
      return 2;
    case "Three Times Daily":
      return 3;
    case ScheduleFrequency.AS_NEEDED:
      return 0; // No scheduled times for "As Needed"
    default:
      return 1;
  }
};

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
