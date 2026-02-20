import { Tables } from "@/database.types";
import moment from "moment";

/**
 * Gets the nearest upcoming vaccination for a pet
 * Returns the vaccination with the earliest next_due_date that is today or in the future
 */
export const getNearestUpcomingVaccination = (
  vaccinations: Tables<"vaccinations">[]
): Tables<"vaccinations"> | null => {
  const today = moment().startOf("day");

  const futureVaccinations = vaccinations
    .filter((vaccination) => {
      if (!vaccination.next_due_date) return false;
      const dueDate = moment(vaccination.next_due_date).startOf("day");
      return dueDate.isSameOrAfter(today);
    })
    .sort((a, b) => {
      const dateA = moment(a.next_due_date!);
      const dateB = moment(b.next_due_date!);
      return dateA.diff(dateB);
    });

  return futureVaccinations.length > 0 ? futureVaccinations[0] : null;
};

/**
 * Checks if a vaccination is overdue
 */
export const isVaccinationOverdue = (
  vaccination: Tables<"vaccinations">
): boolean => {
  if (!vaccination.next_due_date) return false;
  return moment(vaccination.next_due_date).isBefore(moment().startOf("day"));
};

/**
 * Gets all overdue vaccinations
 */
export const getOverdueVaccinations = (
  vaccinations: Tables<"vaccinations">[]
): Tables<"vaccinations">[] => {
  return vaccinations.filter(isVaccinationOverdue);
};
