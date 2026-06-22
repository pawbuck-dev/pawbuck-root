import { getSubscriptionModalTokens } from "@/components/subscription/subscriptionModalTokens";
import { darkTheme } from "@/theme/dark";

describe("getSubscriptionModalTokens", () => {
  it("uses app shell background in dark mode (not card gray)", () => {
    const ui = getSubscriptionModalTokens(darkTheme, true);
    expect(ui.pageBg).toBe(darkTheme.background);
    expect(ui.pageBg).not.toBe(darkTheme.card);
  });

  it("uses light shell background in light mode", () => {
    const ui = getSubscriptionModalTokens(darkTheme, false);
    expect(ui.pageBg).toBe("#F5F7F8");
  });
});
