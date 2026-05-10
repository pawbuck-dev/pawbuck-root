import type { Theme } from "@/theme/model";

/**
 * Milo Chat UI tokens for light and dark themes.
 * `screenBg` matches app shell (`theme.background`) so Milo uses the same canvas as the rest of the app.
 */

// ============================================================================
// LIGHT THEME TOKENS
// ============================================================================

export const MILO_LIGHT = {
  /** Overridden by `getMiloChatTokens` with `theme.background` */
  screenBg: "#F5F7F8",
  composerBorder: "#E4E7E7",
  composerBg: "#FFFFFF",
  placeholder: "#A2A9A9",
  iconWell: "#F4F5F5",
  textPrimary: "#0D0F0F",
  textSecondary: "#70787E",
  chipBg: "#FFFFFF",
  chipBorder: "#D1D5DB",
  messageUserBg: "#2BA89E", // theme.primary for light
  messageUserText: "#FFFFFF",
  messageAiBg: "#FFFFFF",
  messageAiText: "#0D0F0F",
} as const;

// ============================================================================
// DARK THEME TOKENS
// ============================================================================

export const MILO_DARK = {
  /** Overridden by `getMiloChatTokens` with `theme.background` */
  screenBg: "#0B0F14",
  // Composer input
  /** Slightly lifted so the composer + starter pills read on `#0B0F14` shells */
  composerBorder: "rgba(255,255,255,0.16)",
  composerBg: "rgba(255,255,255,0.10)",
  placeholder: "rgba(255,255,255,0.5)",
  // Icon/accent wells
  iconWell: "rgba(255,255,255,0.08)",
  // Text colors
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.7)",
  // Suggested prompt chips / starter pills
  chipBg: "rgba(255,255,255,0.14)",
  chipBorder: "rgba(255,255,255,0.28)",
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
  const base = isDark ? MILO_DARK : MILO_LIGHT;
  return {
    ...base,
    screenBg: theme.background,
  };
}
