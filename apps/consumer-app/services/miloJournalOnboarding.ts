import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "milo_onboarding_seen_v1";

export async function hasSeenMiloJournalOnboarding(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === "1";
  } catch {
    return false;
  }
}

export async function setMiloJournalOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, "1");
  } catch {
    /* best effort */
  }
}
