import {
  resolveSubscriptionOfferingPrices,
  buildProductPriceMap,
  findPackageForPlan,
} from "@/utils/subscriptionOfferingPrices";
import type { PurchasesOfferings } from "react-native-purchases";

const mockOfferings = (products: Record<string, string>): PurchasesOfferings =>
  ({
    current: {
      identifier: "default",
      serverDescription: "default",
      availablePackages: Object.entries(products).map(([identifier, priceString]) => ({
        identifier,
        packageType: "CUSTOM",
        product: { identifier, priceString },
      })),
    },
    all: {},
  }) as unknown as PurchasesOfferings;

describe("resolveSubscriptionOfferingPrices", () => {
  it("uses RevenueCat localized prices when offerings are present", () => {
    const offerings = mockOfferings({
      individual_monthly: "$5.99",
      individual_annual: "$49.99",
      family_monthly: "$9.99",
      family_annual: "$79.99",
    });
    const prices = resolveSubscriptionOfferingPrices(offerings);
    expect(prices.individual.monthly).toBe("$5.99");
    expect(prices.individual.compareSummary).toBe("from $5.99/mo");
    expect(prices.family.monthly).toBe("$9.99");
    expect(prices.individual.footerLine).toContain("Individual $5.99/mo");
  });

  it("falls back to static USD copy when offerings are missing", () => {
    const prices = resolveSubscriptionOfferingPrices(null);
    expect(prices.individual.compareSummary).toBe("from $5.99/mo");
    expect(prices.family.compareSummary).toBe("from $9.99/mo");
  });
});

describe("findPackageForPlan", () => {
  it("finds monthly package by product id", () => {
    const offerings = mockOfferings({ individual_monthly: "$5.99" });
    const pkg = findPackageForPlan(offerings, "individual", "monthly");
    expect(pkg?.product.identifier).toBe("individual_monthly");
  });
});

describe("buildProductPriceMap", () => {
  it("indexes all known SKUs present in the offering", () => {
    const map = buildProductPriceMap(
      mockOfferings({
        founding_family: "$54.99",
        family_monthly: "$9.99",
      })
    );
    expect(map.founding_family).toBe("$54.99");
    expect(map.family_monthly).toBe("$9.99");
  });
});
