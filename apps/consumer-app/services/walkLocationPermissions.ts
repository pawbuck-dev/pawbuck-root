import AsyncStorage from "@react-native-async-storage/async-storage";

const ALWAYS_EXPLAINER_KEY = "@pawbuck/pawthon_always_explainer_seen_v1";

export async function hasSeenPawthonAlwaysExplainer(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ALWAYS_EXPLAINER_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function markPawthonAlwaysExplainerSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ALWAYS_EXPLAINER_KEY, "1");
  } catch {
    /* ignore */
  }
}

export type WalkLocationForegroundResult = {
  granted: boolean;
  status: string;
};

export async function requestWalkForegroundLocation(
  Location: typeof import("expo-location")
): Promise<WalkLocationForegroundResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return { granted: status === "granted", status };
}

export type WalkBackgroundPrepResult =
  | { mode: "background"; granted: true }
  | { mode: "foreground_only"; granted: false };

/**
 * After when-in-use is granted: optionally request Always / background (iOS + Android).
 * Call only after showing the in-app explainer when appropriate.
 */
export async function requestWalkBackgroundLocation(
  Location: typeof import("expo-location")
): Promise<WalkBackgroundPrepResult> {
  const first = await Location.requestBackgroundPermissionsAsync();
  if (first.status === "granted") {
    return { mode: "background", granted: true };
  }
  const second = await Location.requestBackgroundPermissionsAsync();
  if (second.status === "granted") {
    return { mode: "background", granted: true };
  }
  return { mode: "foreground_only", granted: false };
}

export async function getWalkBackgroundPermissionStatus(
  Location: typeof import("expo-location")
): Promise<{ status: string; granted: boolean }> {
  const r = await Location.getBackgroundPermissionsAsync();
  return { status: r.status, granted: r.status === "granted" };
}
