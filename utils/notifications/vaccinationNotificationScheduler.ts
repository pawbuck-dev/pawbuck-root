import { Pet } from "@/context/selectedPetContext";
import { Vaccination } from "@/models/vaccination";
import * as Notifications from "expo-notifications";
import moment from "moment";
import { buildVaccinationNotificationContent } from "./notificationContent";
import {
  clearNotificationIds,
  getNotificationIds,
  saveNotificationIds,
} from "./notificationStorage";

/**
 * Schedule notification for a single vaccination
 */
export const scheduleNotificationForVaccination = async (
  vaccination: Vaccination,
  pet: Pet,
  reminderDays: number
): Promise<string | null> => {
  try {
    // Skip if no next_due_date
    if (!vaccination.next_due_date) {
      return null;
    }

    // Calculate reminder date (X days before due date)
    const reminderMoment = moment(vaccination.next_due_date).subtract(
      reminderDays,
      "days"
    );

    // Skip if reminder date is in the past
    if (reminderMoment.startOf("day").isBefore(moment().startOf("day"))) {
      return null;
    }

    const content = buildVaccinationNotificationContent(vaccination, pet);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        year: reminderMoment.year(),
        month: reminderMoment.month() + 1, // moment months are 0-indexed, calendar trigger expects 1-indexed
        day: reminderMoment.date(),
        hour: 9, // Default to 9 AM
        minute: 0,
      },
    });

    // Save notification ID to storage
    await saveNotificationIds(`vaccination:${vaccination.id}`, [
      notificationId,
    ]);

    return notificationId;
  } catch (error) {
    console.error(
      `Error scheduling notification for vaccination ${vaccination.id}:`,
      error
    );
    return null;
  }
};

/**
 * Cancel notification for a specific vaccination
 */
export const cancelNotificationForVaccination = async (
  vaccinationId: string
): Promise<void> => {
  try {
    const notificationIds = await getNotificationIds(
      `vaccination:${vaccinationId}`
    );

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

