import { ScheduleFrequency } from "@/constants/schedules";
import { Pet } from "@/context/selectedPetContext";
import { MedicineData } from "@/models/medication";
import * as Notifications from "expo-notifications";
import {
  buildNotificationContent,
  NotificationContent,
} from "./notificationContent";
import {
  clearAllNotificationIds,
  clearNotificationIds,
  getNotificationIds,
  saveNotificationIds,
} from "./notificationStorage";

const scheduleDailyNotification = async (
  medicine: MedicineData,
  content: NotificationContent
): Promise<string[]> => {
  if (medicine.frequency !== ScheduleFrequency.DAILY) {
    return [];
  }

  const notificationIds: string[] = [];
  for (const scheduled_time of medicine.schedules) {
    const [hour, minute] = scheduled_time.time.split(":");
    const id = await Notifications.scheduleNotificationAsync({
      content: content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: parseInt(hour),
        minute: parseInt(minute),
      },
    });
    notificationIds.push(id);
  }
  return notificationIds;
};

const scheduleWeeklyNotification = async (
  medicine: MedicineData,
  content: NotificationContent
): Promise<string[]> => {
  if (medicine.frequency !== ScheduleFrequency.WEEKLY) {
    return [];
  }

  const notificationIds: string[] = [];
  for (const schedule of medicine.schedules) {
    const [hour, minute] = schedule.time.split(":");
    const id = await Notifications.scheduleNotificationAsync({
      content: content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        hour: parseInt(hour),
        minute: parseInt(minute),
        weekday: schedule.day_of_week,
      },
    });
    notificationIds.push(id);
  }
  return notificationIds;
};

const scheduleMonthlyNotification = async (
  medicine: MedicineData,
  content: NotificationContent
): Promise<string[]> => {
  if (medicine.frequency !== ScheduleFrequency.MONTHLY) {
    return [];
  }
  const notificationIds: string[] = [];
  for (const schedule of medicine.schedules) {
    const [hour, minute] = schedule.time.split(":");
    const id = await Notifications.scheduleNotificationAsync({
      content: content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: schedule.day_of_month,
        hour: parseInt(hour),
        minute: parseInt(minute),
      },
    });
    notificationIds.push(id);
  }
  return notificationIds;
};

/**
 * Schedule all notifications for a single medicine
 */
export const scheduleNotificationsForMedicine = async (
  medicine: MedicineData,
  pet: Pet
): Promise<string[]> => {
  try {
    // Skip "As Needed" medications
    if (medicine.frequency === ScheduleFrequency.AS_NEEDED) {
      return [];
    }

    const notificationIds: string[] = [];

    const content = buildNotificationContent(medicine, pet);

    switch (medicine.frequency) {
      case ScheduleFrequency.DAILY:
        notificationIds.push(
          ...(await scheduleDailyNotification(medicine, content))
        );
        break;
      case ScheduleFrequency.WEEKLY:
        notificationIds.push(
          ...(await scheduleWeeklyNotification(medicine, content))
        );
        break;
      case ScheduleFrequency.MONTHLY:
        notificationIds.push(
          ...(await scheduleMonthlyNotification(medicine, content))
        );
        break;
      default:
        return [];
    }

    // Save notification IDs to storage
    if (notificationIds.length > 0) {
      await saveNotificationIds(medicine.id, notificationIds);
    }

    return notificationIds;
  } catch (error) {
    console.error(
      `Error scheduling notifications for medicine ${medicine.id}:`,
      error
    );
    return [];
  }
};

/**
 * Cancel all notifications for a specific medicine
 */
export const cancelNotificationsForMedicine = async (
  medicineId: string
): Promise<void> => {
  try {
    // Get stored notification IDs
    const notificationIds = await getNotificationIds(medicineId);

    // Cancel each notification
    for (const notificationId of notificationIds) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      } catch (error) {
        console.warn(`Failed to cancel notification ${notificationId}:`, error);
      }
    }

    // Clear stored IDs
    await clearNotificationIds(medicineId);
  } catch (error) {
    console.error(
      `Error canceling notifications for medicine ${medicineId}:`,
      error
    );
  }
};

/**
 * Cancel all scheduled medication notifications
 */
export const cancelAllNotifications = async (): Promise<void> => {
  try {
    // Cancel all scheduled notifications at once
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Clear all stored notification IDs
    await clearAllNotificationIds();
  } catch (error) {
    console.error("Error canceling all notifications:", error);
  }
};
