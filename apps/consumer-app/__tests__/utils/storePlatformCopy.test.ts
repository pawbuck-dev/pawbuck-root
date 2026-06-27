import {
  checkingSubscriptionStoreLabel,
  manageSubscriptionInStoreLabel,
  subscriptionStoreName,
} from "@/utils/storePlatformCopy";
import { Platform } from "react-native";

describe("storePlatformCopy", () => {
  afterEach(() => {
    Platform.OS = "ios";
  });

  it("uses App Store on iOS", () => {
    Platform.OS = "ios";
    expect(subscriptionStoreName()).toBe("App Store");
    expect(manageSubscriptionInStoreLabel()).toBe("Manage in App Store");
    expect(checkingSubscriptionStoreLabel()).toBe("Checking App Store…");
  });

  it("uses Play Store on Android", () => {
    Platform.OS = "android";
    expect(subscriptionStoreName()).toBe("Play Store");
    expect(manageSubscriptionInStoreLabel()).toBe("Manage in Play Store");
    expect(checkingSubscriptionStoreLabel()).toBe("Checking Play Store…");
  });
});
