import { Pet } from "@/context/selectedPetContext";
import { Vaccination } from "@/types/vaccination";
import { computeVaccineReminderFires } from "@/utils/vaccineReminderDates";
import * as Notifications from "expo-notifications";
import { buildVaccinationNotificationContent } from "./notificationContent";
import {
  clearNotificationIds,
  getNotificationIds,
  saveNotificationIds,
} from "./notificationStorage";

/**
 * Schedule up to three local notifications per vaccination (30 days, 7 days, day-of due date at 9:00).
 */
export const scheduleNotificationForVaccination = async (
  vaccination: Vaccination,
  pet: Pet
): Promise<string[]> => {
  try {
    if (!vaccination.next_due_date) {
      return [];
    }

    await cancelNotificationForVaccination(vaccination.id);

    const now = new Date();
    const fires = computeVaccineReminderFires(vaccination.next_due_date, now);
    const notificationIds: string[] = [];

    for (const { offsetDays, fireAt } of fires) {
      const content = buildVaccinationNotificationContent(vaccination, pet, offsetDays);
      const notificationId = await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
        },
      });
      notificationIds.push(notificationId);
    }

    if (notificationIds.length > 0) {
      await saveNotificationIds(`vaccination:${vaccination.id}`, notificationIds);
    }

    return notificationIds;
  } catch (error) {
    console.error(
      `Error scheduling notification for vaccination ${vaccination.id}:`,
      error
    );
    return [];
  }
};

/**
 * Cancel all scheduled notifications for a specific vaccination
 */
export const cancelNotificationForVaccination = async (
  vaccinationId: string
): Promise<void> => {
  try {
    const notificationIds = await getNotificationIds(`vaccination:${vaccinationId}`);

    for (const notificationId of notificationIds) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      } catch (error) {
        console.warn(`Failed to cancel notification ${notificationId}:`, error);
      }
    }

    await clearNotificationIds(`vaccination:${vaccinationId}`);
  } catch (error) {
    console.error(
      `Error canceling notification for vaccination ${vaccinationId}:`,
      error
    );
  }
};
