import {
  REVENUECAT_ENTITLEMENT_IDS,
  REVENUECAT_FAMILY_ENTITLEMENT_ID,
  REVENUECAT_INDIVIDUAL_ENTITLEMENT_ID,
  REVENUECAT_PRO_ENTITLEMENT_ID,
} from "@/constants/revenuecat";
import type { SubscriptionPlan } from "@/constants/subscriptionPlans";

/** Resolve highest active plan from RevenueCat customer info. */
export function customerInfoActivePlan(customerInfo: {
  entitlements: { active: Record<string, unknown> };
}): SubscriptionPlan | null {
  const active = customerInfo.entitlements.active;
  if (typeof active[REVENUECAT_FAMILY_ENTITLEMENT_ID] !== "undefined") return "family";
  if (typeof active[REVENUECAT_INDIVIDUAL_ENTITLEMENT_ID] !== "undefined") return "individual";
  if (typeof active[REVENUECAT_PRO_ENTITLEMENT_ID] !== "undefined") return "individual";
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
