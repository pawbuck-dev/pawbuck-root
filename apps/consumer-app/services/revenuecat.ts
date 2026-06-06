import { Platform } from "react-native";
import type { SubscriptionPlan } from "@/constants/subscriptionPlans";
import {
  customerInfoActivePlan,
  customerInfoHasPaidEntitlement,
} from "@/utils/revenuecatEntitlement";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

let configured = false;

/** True after `configureRevenueCat()` has successfully called `Purchases.configure`. */
export function isRevenueCatConfigured(): boolean {
  return configured;
}

/**
 * Call once after app shell is ready. Uses EXPO_PUBLIC_REVENUECAT_IOS_API_KEY /
 * EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY (same value is fine for RevenueCat test keys).
 * No-ops on web or when keys are missing.
 */
export function configureRevenueCat(): void {
  if (Platform.OS === "web") return;

  const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim();
  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();
  const apiKey = Platform.OS === "ios" ? iosKey : androidKey;

  if (!apiKey) {
    if (__DEV__) {
      console.warn(
        "[RevenueCat] Set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY and EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY in .env.local"
      );
    }
    return;
  }

  if (configured) return;

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey });
  configured = true;
}

/**
 * Bind RevenueCat app user id to Supabase auth user id for webhooks and entitlements.
 * Call when session changes; pass null on sign-out.
 */
export async function syncRevenueCatUser(userId: string | null): Promise<void> {
  if (Platform.OS === "web") return;
  configureRevenueCat();
  if (!configured) return;

  try {
    if (userId) {
      await Purchases.logIn(userId);
    } else {
      await Purchases.logOut();
    }
  } catch (e) {
    console.warn("[RevenueCat] sync user failed:", e);
  }
}

/**
 * Whether the current RevenueCat user has any paid entitlement.
 */
export async function getHasPawbuckProEntitlement(): Promise<boolean> {
  return (await getRevenueCatPlan()) !== null;
}

export async function getRevenueCatPlan(): Promise<SubscriptionPlan | null> {
  if (Platform.OS === "web") return null;
  configureRevenueCat();
  if (!configured) return null;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfoActivePlan(customerInfo);
  } catch (e) {
    console.warn("[RevenueCat] getCustomerInfo failed:", e);
    return null;
  }
}
