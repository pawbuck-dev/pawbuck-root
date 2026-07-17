import { Platform } from "react-native";
import { isMonetizationEnabled } from "@/constants/monetization";
import type { SubscriptionPlan } from "@/constants/subscriptionPlans";
import {
  customerInfoActivePlan,
} from "@/utils/revenuecatEntitlement";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

let configured = false;
/** Ensures RevenueCat creates the subscriber before offerings / attribute sync race. */
let bootstrapPromise: Promise<void> | null = null;
let loginChain: Promise<void> = Promise.resolve();

/** True after `configureRevenueCat()` has successfully called `Purchases.configure`. */
export function isRevenueCatConfigured(): boolean {
  return configured;
}

function startRevenueCatBootstrap(): void {
  if (bootstrapPromise) return;
  bootstrapPromise = Purchases.getCustomerInfo()
    .then(() => undefined)
    .catch((e) => {
      if (__DEV__) {
        console.warn("[RevenueCat] bootstrap getCustomerInfo failed:", e);
      }
    });
}

/**
 * Wait until Purchases.configure finished and the backend subscriber record exists.
 * Avoids "subscriber was not found" when the SDK syncs attributes before first GET /subscribers.
 */
export async function waitForRevenueCatReady(): Promise<boolean> {
  if (!isMonetizationEnabled()) return false;
  configureRevenueCat();
  if (!configured) return false;
  if (bootstrapPromise) await bootstrapPromise;
  return true;
}

/**
 * Call once after app shell is ready. Uses EXPO_PUBLIC_REVENUECAT_IOS_API_KEY /
 * EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY (same value is fine for RevenueCat test keys).
 * No-ops on web, when monetization is off, or when keys are missing.
 */
export function configureRevenueCat(): void {
  if (Platform.OS === "web") return;
  if (!isMonetizationEnabled()) return;

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

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.WARN : LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey });
  configured = true;
  startRevenueCatBootstrap();
}

/**
 * Bind RevenueCat app user id to Supabase auth user id for webhooks and entitlements.
 * Call when session changes; pass null on sign-out.
 */
export async function syncRevenueCatUser(userId: string | null): Promise<void> {
  if (Platform.OS === "web") return;
  if (!isMonetizationEnabled()) return;

  loginChain = loginChain.then(async () => {
    const ready = await waitForRevenueCatReady();
    if (!ready) return;

    try {
      if (userId) {
        await Purchases.logIn(userId);
      } else {
        await Purchases.logOut();
      }
    } catch (e) {
      console.warn("[RevenueCat] sync user failed:", e);
    }
  });

  await loginChain;
}

/**
 * Whether the current RevenueCat user has any paid entitlement.
 */
export async function getHasPawbuckProEntitlement(): Promise<boolean> {
  return (await getRevenueCatPlan()) !== null;
}

/** Refresh CustomerInfo from RevenueCat after purchase / restore. */
export async function refreshRevenueCatCustomerInfo(): Promise<SubscriptionPlan | null> {
  const ready = await waitForRevenueCatReady();
  if (!ready) return null;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const plan = customerInfoActivePlan(customerInfo);
    if (__DEV__) {
      console.log(
        "[RevenueCat] active entitlements:",
        Object.keys(customerInfo.entitlements.active ?? {}),
        "→ plan:",
        plan ?? "free"
      );
    }
    return plan;
  } catch (e) {
    console.warn("[RevenueCat] refresh customer info failed:", e);
    return null;
  }
}

export async function getRevenueCatPlan(): Promise<SubscriptionPlan | null> {
  return refreshRevenueCatCustomerInfo();
}

/** Restore App Store / Play purchases via RevenueCat. Returns active plan if any. */
export async function restoreRevenueCatPurchases(): Promise<SubscriptionPlan | null> {
  if (Platform.OS === "web") return null;
  const ready = await waitForRevenueCatReady();
  if (!ready) {
    throw new Error("Subscriptions are not configured in this build.");
  }

  const customerInfo = await Purchases.restorePurchases();
  return customerInfoActivePlan(customerInfo);
}
