export type PaywallSubscribeInput = {
  platform: "ios" | "android" | "web";
  revenueCatConfigured: boolean;
  paywallPresented: boolean;
  purchaseSuccess: boolean;
};

export type PaywallSubscribeResult =
  | { action: "close" }
  | { action: "openStore" }
  | { action: "showError"; message: string };

/** Resolve paywall subscribe button outcome for testable flow logic. */
export function resolvePaywallSubscribeResult(input: PaywallSubscribeInput): PaywallSubscribeResult {
  if (input.platform === "web") {
    return { action: "openStore" };
  }
  if (input.purchaseSuccess) {
    return { action: "close" };
  }
  if (!input.paywallPresented && input.revenueCatConfigured) {
    return {
      action: "showError",
      message: "Couldn't load subscription plans. Please try again.",
    };
  }
  if (!input.revenueCatConfigured) {
    return { action: "openStore" };
  }
  return { action: "showError", message: "Purchase was not completed." };
}
