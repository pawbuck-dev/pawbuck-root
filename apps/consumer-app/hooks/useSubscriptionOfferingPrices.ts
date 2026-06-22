import { getSubscriptionOfferingPrices } from "@/services/revenuecatOfferings";
import { Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";

/** Live store prices from RevenueCat offerings; falls back to docs/PRICING.md copy offline. */
export function useSubscriptionOfferingPrices(enabled = true) {
  return useQuery({
    queryKey: ["subscription_offering_prices"],
    queryFn: getSubscriptionOfferingPrices,
    enabled: enabled && Platform.OS !== "web",
    staleTime: 5 * 60 * 1000,
  });
}
