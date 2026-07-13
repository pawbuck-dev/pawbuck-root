import {
  refreshRevenueCatCustomerInfo,
  syncRevenueCatUser,
  waitForRevenueCatReady,
} from "@/services/revenuecat";
import {
  findPackageForPlan,
  resolveSubscriptionOfferingPrices,
  type PaidPlan,
  type SubscriptionOfferingPrices,
} from "@/utils/subscriptionOfferingPrices";
import { customerInfoActivePlan } from "@/utils/revenuecatEntitlement";
import type { SubscriptionBillingPeriod } from "@/constants/subscriptionProducts";
import { supabase } from "@/utils/supabase";
import { Platform } from "react-native";
import Purchases, { type PurchasesOfferings } from "react-native-purchases";

export async function fetchRevenueCatOfferings(): Promise<PurchasesOfferings | null> {
  if (Platform.OS === "web") return null;
  const ready = await waitForRevenueCatReady();
  if (!ready) return null;

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
  const ready = await waitForRevenueCatReady();
  if (!ready) {
    return { purchased: false, cancelled: false };
  }

  const offerings = await fetchRevenueCatOfferings();
  const pkg = findPackageForPlan(offerings, plan, period);
  if (!pkg) {
    if (__DEV__) {
      console.warn("[RevenueCat] no package for", plan, period);
    }
    return { purchased: false, cancelled: false };
  }

  const { data: authData } = await supabase.auth.getUser();
  if (authData.user?.id) {
    await syncRevenueCatUser(authData.user.id);
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    let activePlan = customerInfoActivePlan(customerInfo);
    if (!activePlan) {
      activePlan = await refreshRevenueCatCustomerInfo();
    }
    return { purchased: activePlan !== null, cancelled: false };
  } catch (e: unknown) {
    const err = e as { userCancelled?: boolean };
    if (err?.userCancelled) {
      return { purchased: false, cancelled: true };
    }
    throw e;
  }
}
