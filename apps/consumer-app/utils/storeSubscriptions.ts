import { PRIVACY_POLICY_URL } from "@/constants/legal";
import { Linking, Platform } from "react-native";

/** Open Apple / Google subscription management for PawBuck billing. */
export function openStoreSubscriptionSettings(): void {
  if (Platform.OS === "ios") {
    void Linking.openURL("https://apps.apple.com/account/subscriptions");
    return;
  }
  if (Platform.OS === "android") {
    void Linking.openURL("https://play.google.com/store/account/subscriptions");
    return;
  }
  void Linking.openURL(PRIVACY_POLICY_URL);
}
