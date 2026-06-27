import { Platform } from "react-native";

/** User-facing store name for the current device (subscriptions / restore). */
export function subscriptionStoreName(): string {
  if (Platform.OS === "ios") return "App Store";
  if (Platform.OS === "android") return "Play Store";
  return "App Store or Google Play";
}

export function manageSubscriptionInStoreLabel(): string {
  return `Manage in ${subscriptionStoreName()}`;
}

export function checkingSubscriptionStoreLabel(): string {
  return `Checking ${subscriptionStoreName()}…`;
}
