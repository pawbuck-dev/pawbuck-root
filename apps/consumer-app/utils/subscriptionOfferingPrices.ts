import type { SubscriptionPlan } from "@/constants/subscriptionPlans";
import {
  SUBSCRIPTION_PRICE_FALLBACK,
  subscriptionProductId,
  type SubscriptionBillingPeriod,
} from "@/constants/subscriptionProducts";
import type { PurchasesOfferings, PurchasesPackage } from "react-native-purchases";

export type PaidPlan = Exclude<SubscriptionPlan, "free">;

export type PlanPriceDisplay = {
  monthly: string | null;
  annual: string | null;
  founding: string | null;
  /** One-line price for compare cards, e.g. "from $5.99/mo" */
  compareSummary: string;
  /** Footer line under paywall */
  footerLine: string;
};

export type SubscriptionOfferingPrices = Record<PaidPlan, PlanPriceDisplay>;

type ProductPriceMap = Partial<Record<string, string>>;

function packagesFromOffering(offering: PurchasesOfferings["current"]): PurchasesPackage[] {
  if (!offering?.availablePackages) return [];
  return Array.isArray(offering.availablePackages)
    ? offering.availablePackages
    : Object.values(offering.availablePackages);
}

function findPackageByProductId(offerings: PurchasesOfferings, productId: string): PurchasesPackage | null {
  const pools: PurchasesPackage[][] = [packagesFromOffering(offerings.current)];
  for (const offering of Object.values(offerings.all ?? {})) {
    pools.push(packagesFromOffering(offering));
  }
  for (const packages of pools) {
    for (const pkg of packages) {
      if (pkg.product.identifier === productId) return pkg;
    }
  }
  return null;
}

export function buildProductPriceMap(offerings: PurchasesOfferings | null | undefined): ProductPriceMap {
  if (!offerings) return {};
  const map: ProductPriceMap = {};
  for (const productId of [
    subscriptionProductId("individual", "monthly"),
    subscriptionProductId("individual", "annual"),
    subscriptionProductId("individual", "founding"),
    subscriptionProductId("family", "monthly"),
    subscriptionProductId("family", "annual"),
    subscriptionProductId("family", "founding"),
  ]) {
    const pkg = findPackageByProductId(offerings, productId);
    if (pkg?.product.priceString) {
      map[productId] = pkg.product.priceString;
    }
  }
  return map;
}

function priceOrFallback(
  map: ProductPriceMap,
  plan: PaidPlan,
  period: SubscriptionBillingPeriod,
  fallback: string
): string | null {
  const id = subscriptionProductId(plan, period);
  return map[id] ?? fallback;
}

function formatMonthlyLabel(price: string): string {
  if (price.includes("/")) return price;
  return `${price}/mo`;
}

/** Map RevenueCat offerings (+ fallbacks) to UI-friendly plan prices. Pure — easy to test. */
export function resolveSubscriptionOfferingPrices(
  offerings: PurchasesOfferings | null | undefined
): SubscriptionOfferingPrices {
  const map = buildProductPriceMap(offerings);

  const individualMonthlyRaw =
    priceOrFallback(map, "individual", "monthly", SUBSCRIPTION_PRICE_FALLBACK.individual.monthly) ??
    SUBSCRIPTION_PRICE_FALLBACK.individual.monthly;
  const familyMonthlyRaw =
    priceOrFallback(map, "family", "monthly", SUBSCRIPTION_PRICE_FALLBACK.family.monthly) ??
    SUBSCRIPTION_PRICE_FALLBACK.family.monthly;

  const individualMonthly = formatMonthlyLabel(individualMonthlyRaw);
  const familyMonthly = formatMonthlyLabel(familyMonthlyRaw);

  const individual: PlanPriceDisplay = {
    monthly: priceOrFallback(map, "individual", "monthly", SUBSCRIPTION_PRICE_FALLBACK.individual.monthly),
    annual: priceOrFallback(map, "individual", "annual", SUBSCRIPTION_PRICE_FALLBACK.individual.annual),
    founding: priceOrFallback(map, "individual", "founding", SUBSCRIPTION_PRICE_FALLBACK.individual.founding),
    compareSummary: map[subscriptionProductId("individual", "monthly")]
      ? `from ${formatMonthlyLabel(map[subscriptionProductId("individual", "monthly")]!)}`
      : SUBSCRIPTION_PRICE_FALLBACK.individual.compareSummary,
    footerLine: "",
  };

  const family: PlanPriceDisplay = {
    monthly: priceOrFallback(map, "family", "monthly", SUBSCRIPTION_PRICE_FALLBACK.family.monthly),
    annual: priceOrFallback(map, "family", "annual", SUBSCRIPTION_PRICE_FALLBACK.family.annual),
    founding: priceOrFallback(map, "family", "founding", SUBSCRIPTION_PRICE_FALLBACK.family.founding),
    compareSummary: map[subscriptionProductId("family", "monthly")]
      ? `from ${formatMonthlyLabel(map[subscriptionProductId("family", "monthly")]!)}`
      : SUBSCRIPTION_PRICE_FALLBACK.family.compareSummary,
    footerLine: "",
  };

  individual.footerLine = `Individual ${individualMonthly} · Family ${familyMonthly}. Billed by Apple or Google.`;
  family.footerLine = individual.footerLine;

  return { individual, family };
}

export function findPackageForPlan(
  offerings: PurchasesOfferings | null | undefined,
  plan: PaidPlan,
  period: SubscriptionBillingPeriod = "monthly"
): PurchasesPackage | null {
  if (!offerings) return null;
  return findPackageByProductId(offerings, subscriptionProductId(plan, period));
}
