import { REVENUECAT_PRO_ENTITLEMENT_ID } from "@/constants/revenuecat";

/** Matches RevenueCat `getCustomerInfo().entitlements.active['Pawbuck Pro']` check. */
export function customerInfoHasPawbuckProEntitlement(customerInfo: {
  entitlements: { active: Record<string, unknown> };
}): boolean {
  return typeof customerInfo.entitlements.active[REVENUECAT_PRO_ENTITLEMENT_ID] !== "undefined";
}
