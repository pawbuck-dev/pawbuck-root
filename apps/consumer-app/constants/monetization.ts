/**
 * Production monetization kill-switch.
 * Unset / anything other than "true" = OFF (free launch: treat all users as Family).
 * Set EXPO_PUBLIC_MONETIZATION_ENABLED=true when App Store / RevenueCat billing is ready.
 */
export function isMonetizationEnabled(): boolean {
  return process.env.EXPO_PUBLIC_MONETIZATION_ENABLED === "true";
}
