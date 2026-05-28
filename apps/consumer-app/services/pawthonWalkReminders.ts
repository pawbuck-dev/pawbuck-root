import type { Pet } from "@/context/petsContext";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFS_KEY = "@pawbuck/pawthon_walk_reminder_prefs_v1";
const NOTIF_IDS_KEY = "@pawbuck/pawthon_walk_reminder_ids_v1";

export type PawthonWalkReminderPrefs = {
  dailyEnabled: boolean;
  dailyHour: number;
  dailyMinute: number;
  streakProtectionEnabled: boolean;
  streakProtectionHour: number;
  streakProtectionMinute: number;
  weeklyDigestEnabled: boolean;
};

export const DEFAULT_PAWTHON_REMINDER_PREFS: PawthonWalkReminderPrefs = {
  dailyEnabled: false,
  dailyHour: 18,
  dailyMinute: 0,
  streakProtectionEnabled: false,
  streakProtectionHour: 18,
  streakProtectionMinute: 0,
  weeklyDigestEnabled: false,
};

export async function loadPawthonReminderPrefs(): Promise<PawthonWalkReminderPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PAWTHON_REMINDER_PREFS };
    return { ...DEFAULT_PAWTHON_REMINDER_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PAWTHON_REMINDER_PREFS };
  }
}

export async function savePawthonReminderPrefs(prefs: PawthonWalkReminderPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

async function loadNotifIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_IDS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function saveNotifIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(NOTIF_IDS_KEY, JSON.stringify(ids));
}

export async function cancelPawthonWalkReminders(): Promise<void> {
  const ids = await loadNotifIds();
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      /* ignore */
    }
  }
  await saveNotifIds([]);
}

export async function schedulePawthonWalkReminders(pet: Pet, prefs: PawthonWalkReminderPrefs): Promise<void> {
  await cancelPawthonWalkReminders();
  const ids: string[] = [];

  if (prefs.dailyEnabled) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time for a walk?",
        body: `${pet.name} is ready — even 10 minutes counts.`,
        data: { url: "/pawthon-walk", petId: pet.id, notificationKind: "pawthon_daily" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: prefs.dailyHour,
        minute: prefs.dailyMinute,
      },
    });
    ids.push(id);
  }

  if (prefs.streakProtectionEnabled) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Keep your streak",
        body: `Walk with ${pet.name} before midnight to stay on track.`,
        data: { url: "/pawthon-walk", petId: pet.id, notificationKind: "pawthon_streak" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: prefs.streakProtectionHour,
        minute: prefs.streakProtectionMinute,
      },
    });
    ids.push(id);
  }

  if (prefs.weeklyDigestEnabled) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Your week in Pawthon",
        body: "See how far you walked this week.",
        data: { url: "/pawthon/weekly", petId: pet.id, notificationKind: "pawthon_weekly" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 2,
        hour: 9,
        minute: 0,
      },
    });
    ids.push(id);
  }

  await saveNotifIds(ids);
}
