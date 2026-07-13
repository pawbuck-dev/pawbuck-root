import { waitForRevenueCatReady } from "@/services/revenuecat";
import { Platform } from "react-native";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

export { PAYWALL_RESULT };

/**
 * Presents the RevenueCat dashboard paywall (current offering).
 * Configure a paywall in RevenueCat before calling.
 * @returns true if the user purchased or restored; false otherwise.
 */
export async function presentRevenueCatPaywall(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const ready = await waitForRevenueCatReady();
  if (!ready) return false;

  try {
    const paywallResult = await RevenueCatUI.presentPaywall();

    switch (paywallResult) {
      case PAYWALL_RESULT.NOT_PRESENTED:
      case PAYWALL_RESULT.ERROR:
      case PAYWALL_RESULT.CANCELLED:
        return false;
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
        return true;
      default:
        return false;
    }
  } catch (e) {
    console.warn("[RevenueCat] presentPaywall failed:", e);
    return false;
  }
}
