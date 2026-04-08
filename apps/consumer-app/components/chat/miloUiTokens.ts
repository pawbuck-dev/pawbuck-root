import type { Theme } from "@/theme/model";

/**
 * Milo Chat UI tokens for light and dark themes.
 * Full-screen backdrop uses `Milo-Light.png` / `Milo-Dark.png`; `screenBg` fills any gaps while the asset loads.
 */

// ============================================================================
// LIGHT THEME TOKENS
// ============================================================================

export const MILO_LIGHT = {
  screenBg: "#F2F7F7",
  composerBorder: "#E4E7E7",
  composerBg: "#FFFFFF",
  placeholder: "#A2A9A9",
  iconWell: "#F4F5F5",
  textPrimary: "#0D0F0F",
  textSecondary: "#70787E",
  chipBg: "#F8FAFA",
  chipBorder: "#E5E7EB",
  messageUserBg: "#2BA89E", // theme.primary for light
  messageUserText: "#FFFFFF",
  messageAiBg: "#FFFFFF",
  messageAiText: "#0D0F0F",
} as const;

// ============================================================================
// DARK THEME TOKENS
// ============================================================================

export const MILO_DARK = {
  // Screen background - vibrant teal gradient (from Figma UIKit)
  screenBg: "#0A4543", // Dark teal base
  // Composer input
  composerBorder: "rgba(255,255,255,0.12)",
  composerBg: "rgba(255,255,255,0.06)",
  placeholder: "rgba(255,255,255,0.5)",
  // Icon/accent wells
  iconWell: "rgba(255,255,255,0.08)",
  // Text colors
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.7)",
  // Suggested prompt chips (Figma: glass pill, visible hairline)
  chipBg: "rgba(255,255,255,0.08)",
  chipBorder: "rgba(255,255,255,0.18)",
  // Message styling
  messageUserBg: "#5FC4C0", // theme.primary
  messageUserText: "#FFFFFF",
  messageAiBg: "rgba(255,255,255,0.08)",
  messageAiText: "#FFFFFF",
} as const;

// ============================================================================
// THEME SELECTOR FUNCTION
// ============================================================================

/**
 * Get Milo chat color tokens based on theme mode.
 * Usage: `const tokens = getMiloChatTokens(theme, isDark);`
 */
export function getMiloChatTokens(theme: Theme, isDark: boolean) {
  return isDark ? MILO_DARK : MILO_LIGHT;
}
