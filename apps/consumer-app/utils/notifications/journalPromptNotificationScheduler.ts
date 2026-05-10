import type { Pet } from "@/context/petsContext";
import * as Notifications from "expo-notifications";
import type { NotificationContent } from "./notificationContent";
import {
  clearNotificationIds,
  getNotificationIds,
  saveNotificationIds,
} from "./notificationStorage";

const storageKey = (petId: string) => `journal_prompt:${petId}`;

export type JournalPromptPrefs = {
  enabled: boolean;
  hour: number;
  minute: number;
};

function buildJournalPromptContent(pet: Pet): NotificationContent {
  return {
    title: `Daily journal — ${pet.name}`,
    body: "Take a moment to log anything notable from today.",
    data: {
      petId: pet.id,
      url: "/(home)/pet-journal",
      notificationKind: "journal_prompt",
    },
  };
}

/**
 * One daily local notification per pet at the configured local time (default 8 PM).
 */
export async function scheduleJournalPromptForPet(
  pet: Pet,
  prefs: JournalPromptPrefs
): Promise<string[]> {
  try {
    await cancelJournalPromptForPet(pet.id);
    if (!prefs.enabled) {
      return [];
    }

    const hour = Math.min(23, Math.max(0, prefs.hour));
    const minute = Math.min(59, Math.max(0, prefs.minute));
    const content = buildJournalPromptContent(pet);

    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    await saveNotificationIds(storageKey(pet.id), [id]);
    return [id];
  } catch (error) {
    console.error(`Error scheduling journal prompt for pet ${pet.id}:`, error);
    return [];
  }
}

export async function cancelJournalPromptForPet(petId: string): Promise<void> {
  try {
    const ids = await getNotificationIds(storageKey(petId));
    for (const notificationId of ids) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      } catch (e) {
        console.warn(`Failed to cancel journal prompt ${notificationId}:`, e);
      }
    }
    await clearNotificationIds(storageKey(petId));
  } catch (error) {
    console.error(`Error canceling journal prompt for pet ${petId}:`, error);
  }
}
