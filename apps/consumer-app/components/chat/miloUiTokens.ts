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
  starterCardBg: "#FFFFFF",
  starterCardBorder: "#E4E7E7",
  starterSectionLabel: "#9097A1",
  greetingEyebrow: "#2BA89E",
  sendGradientStart: "#6FE3DE",
  sendGradientEnd: "#54BAB7",
  sendIconColor: "#06201F",
  sendDisabledBg: "rgba(13,15,15,0.15)",
  sendDisabledIcon: "#70787E",
  messageUserBg: "#2BA89E",
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
  composerBorder: "rgba(255,255,255,0.16)",
  composerBg: "rgba(255,255,255,0.10)",
  placeholder: "rgba(255,255,255,0.5)",
  iconWell: "rgba(255,255,255,0.08)",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.7)",
  chipBg: "rgba(255,255,255,0.14)",
  chipBorder: "rgba(255,255,255,0.28)",
  starterCardBg: "rgba(255,255,255,0.025)",
  starterCardBorder: "rgba(255,255,255,0.07)",
  starterSectionLabel: "#6B717B",
  greetingEyebrow: "#6FE3DE",
  sendGradientStart: "#6FE3DE",
  sendGradientEnd: "#54BAB7",
  sendIconColor: "#06201F",
  sendDisabledBg: "rgba(255,255,255,0.12)",
  sendDisabledIcon: "rgba(255,255,255,0.35)",
  messageUserBg: "#5FC4C0",
  messageUserText: "#FFFFFF",
  messageAiBg: "rgba(255,255,255,0.08)",
  messageAiText: "#FFFFFF",
} as const;

export type MiloChatTokens = ReturnType<typeof getMiloChatTokens>;

/**
 * Get Milo chat color tokens based on theme mode.
 * Usage: `const tokens = getMiloChatTokens(theme, isDark);`
 */
export function getMiloChatTokens(theme: Theme, isDark: boolean) {
  const base = isDark ? MILO_DARK : MILO_LIGHT;
  return {
    ...base,
    screenBg: theme.background,
    greetingEyebrow: isDark ? MILO_DARK.greetingEyebrow : theme.primary,
    sendGradientStart: isDark ? MILO_DARK.sendGradientStart : theme.primary,
    sendGradientEnd: isDark ? MILO_DARK.sendGradientEnd : "#2BA89E",
  };
}
