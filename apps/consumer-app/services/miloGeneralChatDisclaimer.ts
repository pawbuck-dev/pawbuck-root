import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY_PREFIX = "pawbuck_milo_general_chat_disclaimer_v1";

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

export async function hasAcceptedMiloGeneralChatDisclaimer(userId: string): Promise<boolean> {
  const v = await AsyncStorage.getItem(storageKey(userId));
  return v === "1";
}

export async function setAcceptedMiloGeneralChatDisclaimer(userId: string): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), "1");
}
