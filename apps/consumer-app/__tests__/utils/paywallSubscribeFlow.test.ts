import { resolvePaywallSubscribeResult } from "@/utils/paywallSubscribeFlow";

describe("resolvePaywallSubscribeResult", () => {
  it("opens store on web", () => {
    expect(
      resolvePaywallSubscribeResult({
        platform: "web",
        revenueCatConfigured: true,
        paywallPresented: true,
        purchaseSuccess: false,
      })
    ).toEqual({ action: "openStore" });
  });

  it("closes on purchase success", () => {
    expect(
      resolvePaywallSubscribeResult({
        platform: "ios",
        revenueCatConfigured: true,
        paywallPresented: true,
        purchaseSuccess: true,
      })
    ).toEqual({ action: "close" });
  });

  it("shows error when RC configured but paywall not presented", () => {
    const result = resolvePaywallSubscribeResult({
      platform: "ios",
      revenueCatConfigured: true,
      paywallPresented: false,
      purchaseSuccess: false,
    });
    expect(result.action).toBe("showError");
  });

  it("opens store when RC not configured", () => {
    expect(
      resolvePaywallSubscribeResult({
        platform: "android",
        revenueCatConfigured: false,
        paywallPresented: false,
        purchaseSuccess: false,
      })
    ).toEqual({ action: "openStore" });
  });
});
