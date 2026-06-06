import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SubscriptionPlan } from "@/constants/subscriptionPlans";

const DISMISS_KEY_PREFIX = "@pawbuck/streak_upgrade_dismissed_until_v1";

export function streakUpgradeDismissKey(userId: string): string {
  return `${DISMISS_KEY_PREFIX}:${userId}`;
}

export function shouldShowStreakUpgradePrompt(
  streakDays: number,
  plan: SubscriptionPlan,
  dismissedUntilMs: number | null
): boolean {
  if (plan !== "free" || streakDays < 10) return false;
  if (dismissedUntilMs != null && dismissedUntilMs > Date.now()) return false;
  return true;
}

export async function readStreakUpgradeDismissedUntil(userId: string): Promise<number | null> {
  const raw = await AsyncStorage.getItem(streakUpgradeDismissKey(userId));
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function dismissStreakUpgradePrompt(userId: string, days = 30): Promise<void> {
  const until = Date.now() + days * 24 * 60 * 60 * 1000;
  await AsyncStorage.setItem(streakUpgradeDismissKey(userId), String(until));
}
