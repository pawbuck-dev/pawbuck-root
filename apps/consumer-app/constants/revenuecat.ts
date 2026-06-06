/**
 * RevenueCat entitlement identifiers (must match RevenueCat dashboard).
 */
export const REVENUECAT_INDIVIDUAL_ENTITLEMENT_ID = "Pawbuck Individual";
export const REVENUECAT_FAMILY_ENTITLEMENT_ID = "Pawbuck Family";

/** Legacy single-tier entitlement — maps to Individual. */
export const REVENUECAT_PRO_ENTITLEMENT_ID = "Pawbuck Pro";

export const REVENUECAT_ENTITLEMENT_IDS = [
  REVENUECAT_FAMILY_ENTITLEMENT_ID,
  REVENUECAT_INDIVIDUAL_ENTITLEMENT_ID,
  REVENUECAT_PRO_ENTITLEMENT_ID,
] as const;
