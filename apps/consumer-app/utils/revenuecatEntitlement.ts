import {
  REVENUECAT_ENTITLEMENT_IDS,
  REVENUECAT_FAMILY_ENTITLEMENT_ID,
  REVENUECAT_INDIVIDUAL_ENTITLEMENT_ID,
  REVENUECAT_PRO_ENTITLEMENT_ID,
} from "@/constants/revenuecat";
import type { SubscriptionPlan } from "@/constants/subscriptionPlans";

function matchesEntitlementKey(key: string, target: string): boolean {
  return key === target || key.toLowerCase() === target.toLowerCase();
}

/** Resolve highest active plan from RevenueCat customer info. */
export function customerInfoActivePlan(customerInfo: {
  entitlements: { active: Record<string, unknown> };
}): SubscriptionPlan | null {
  const active = customerInfo.entitlements.active ?? {};
  const keys = Object.keys(active);

  if (keys.some((k) => matchesEntitlementKey(k, REVENUECAT_FAMILY_ENTITLEMENT_ID))) {
    return "family";
  }
  if (
    keys.some(
      (k) =>
        matchesEntitlementKey(k, REVENUECAT_INDIVIDUAL_ENTITLEMENT_ID) ||
        matchesEntitlementKey(k, REVENUECAT_PRO_ENTITLEMENT_ID)
    )
  ) {
    return "individual";
  }

  // Fallback: any active entitlement containing family / individual in the id
  if (keys.some((k) => /family/i.test(k))) return "family";
  if (keys.some((k) => /individual|pro/i.test(k))) return "individual";

  return null;
}

export function customerInfoHasPaidEntitlement(customerInfo: {
  entitlements: { active: Record<string, unknown> };
}): boolean {
  return customerInfoActivePlan(customerInfo) !== null;
}

/** @deprecated Use customerInfoHasPaidEntitlement */
export function customerInfoHasPawbuckProEntitlement(customerInfo: {
  entitlements: { active: Record<string, unknown> };
}): boolean {
  return customerInfoHasPaidEntitlement(customerInfo);
}

export { REVENUECAT_ENTITLEMENT_IDS };
