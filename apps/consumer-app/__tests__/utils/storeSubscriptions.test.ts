import { Linking, Platform } from "react-native";
import { openStoreSubscriptionSettings } from "@/utils/storeSubscriptions";

describe("openStoreSubscriptionSettings", () => {
  beforeEach(() => {
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("opens Apple subscriptions on iOS", () => {
    Platform.OS = "ios";
    openStoreSubscriptionSettings();
    expect(Linking.openURL).toHaveBeenCalledWith("https://apps.apple.com/account/subscriptions");
  });

  it("opens Google Play subscriptions on Android", () => {
    Platform.OS = "android";
    openStoreSubscriptionSettings();
    expect(Linking.openURL).toHaveBeenCalledWith(
      "https://play.google.com/store/account/subscriptions"
    );
  });
});
