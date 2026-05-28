import { PAWTHON_DEFAULT_GOAL_METERS, PAWTHON_GOAL_STORAGE_KEY } from "@/constants/pawthonGoals";
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function getDailyGoalMeters(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(PAWTHON_GOAL_STORAGE_KEY);
    if (!raw) return PAWTHON_DEFAULT_GOAL_METERS;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : PAWTHON_DEFAULT_GOAL_METERS;
  } catch {
    return PAWTHON_DEFAULT_GOAL_METERS;
  }
}

export async function setDailyGoalMeters(meters: number): Promise<void> {
  await AsyncStorage.setItem(PAWTHON_GOAL_STORAGE_KEY, String(Math.round(meters)));
}
