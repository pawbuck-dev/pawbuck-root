import type { SubscriptionPlan } from "@/constants/subscriptionPlans";

/** Must match App Store / Play Console + RevenueCat product identifiers. See docs/PRICING.md */
export const SUBSCRIPTION_PRODUCT_IDS = {
  individualMonthly: "individual_monthly",
  individualAnnual: "individual_annual",
  familyMonthly: "family_monthly",
  familyAnnual: "family_annual",
  foundingIndividual: "founding_individual",
  foundingFamily: "founding_family",
} as const;

export type SubscriptionBillingPeriod = "monthly" | "annual" | "founding";

/** Static USD copy when RevenueCat offerings are unavailable (simulator without keys, offline). */
export const SUBSCRIPTION_PRICE_FALLBACK = {
  individual: {
    monthly: "$5.99/mo",
    annual: "$49.99/yr",
    founding: "$34.99 lifetime",
    compareSummary: "from $5.99/mo",
  },
  family: {
    monthly: "$9.99/mo",
    annual: "$79.99/yr",
    founding: "$54.99 lifetime",
    compareSummary: "from $9.99/mo",
  },
} as const;

export function subscriptionProductId(
  plan: Exclude<SubscriptionPlan, "free">,
  period: SubscriptionBillingPeriod
): string {
  if (plan === "individual") {
    if (period === "monthly") return SUBSCRIPTION_PRODUCT_IDS.individualMonthly;
    if (period === "annual") return SUBSCRIPTION_PRODUCT_IDS.individualAnnual;
    return SUBSCRIPTION_PRODUCT_IDS.foundingIndividual;
  }
  if (period === "monthly") return SUBSCRIPTION_PRODUCT_IDS.familyMonthly;
  if (period === "annual") return SUBSCRIPTION_PRODUCT_IDS.familyAnnual;
  return SUBSCRIPTION_PRODUCT_IDS.foundingFamily;
}

export const ALL_SUBSCRIPTION_PRODUCT_IDS = Object.values(SUBSCRIPTION_PRODUCT_IDS);
