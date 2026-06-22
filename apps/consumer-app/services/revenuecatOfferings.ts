import { configureRevenueCat, isRevenueCatConfigured } from "@/services/revenuecat";
import {
  findPackageForPlan,
  resolveSubscriptionOfferingPrices,
  type PaidPlan,
  type SubscriptionOfferingPrices,
} from "@/utils/subscriptionOfferingPrices";
import type { SubscriptionBillingPeriod } from "@/constants/subscriptionProducts";
import { Platform } from "react-native";
import Purchases, { type PurchasesOfferings } from "react-native-purchases";

export async function fetchRevenueCatOfferings(): Promise<PurchasesOfferings | null> {
  if (Platform.OS === "web") return null;
  configureRevenueCat();
  if (!isRevenueCatConfigured()) return null;

  try {
    return await Purchases.getOfferings();
  } catch (e) {
    console.warn("[RevenueCat] getOfferings failed:", e);
    return null;
  }
}

export async function getSubscriptionOfferingPrices(): Promise<SubscriptionOfferingPrices> {
  const offerings = await fetchRevenueCatOfferings();
  return resolveSubscriptionOfferingPrices(offerings);
}

export async function purchaseSubscriptionPackage(
  plan: PaidPlan,
  period: SubscriptionBillingPeriod = "monthly"
): Promise<{ purchased: boolean; cancelled: boolean }> {
  if (Platform.OS === "web") {
    return { purchased: false, cancelled: false };
  }
  configureRevenueCat();
  if (!isRevenueCatConfigured()) {
    return { purchased: false, cancelled: false };
  }

  const offerings = await fetchRevenueCatOfferings();
  const pkg = findPackageForPlan(offerings, plan, period);
  if (!pkg) {
    return { purchased: false, cancelled: false };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = customerInfo.entitlements.active;
    const hasPaid =
      typeof active["Pawbuck Family"] !== "undefined" ||
      typeof active["Pawbuck Individual"] !== "undefined" ||
      typeof active["Pawbuck Pro"] !== "undefined";
    return { purchased: hasPaid, cancelled: false };
  } catch (e: unknown) {
    const err = e as { userCancelled?: boolean };
    if (err?.userCancelled) {
      return { purchased: false, cancelled: true };
    }
    throw e;
  }
}
