import type { Theme } from "@/theme/model";
import { LinearGradientProps } from "expo-linear-gradient";

/**
 * Milo Chat UI tokens for light and dark themes.
 * Based on Figma PawBuck App Redesign (Milo chat screens).
 * 
 * Light mode: Figma 1386:45325 / Milo.svg  
 * Dark mode: Derived from app theme (#182424, #1C2128, #5FC4C0)
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
  backdropGradient: ["#CBFCF5", "#E8F5F4", "#F2F7F7"] as LinearGradientProps["colors"],
  backdropBloom1: "#5CECE2",
  backdropBloom2: "#12BAB7",
  backdropBloom3: "#1ECBFF",
} as const;

// ============================================================================
// DARK THEME TOKENS
// ============================================================================

export const MILO_DARK = {
  // Screen background uses the app's dark background
  screenBg: "#182424", // theme.background
  // Composer input
  composerBorder: "rgba(255,255,255,0.12)",
  composerBg: "rgba(255,255,255,0.06)",
  placeholder: "rgba(255,255,255,0.5)",
  // Icon/accent wells
  iconWell: "rgba(255,255,255,0.08)",
  // Text colors
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.7)",
  // Suggested prompt chips
  chipBg: "rgba(255,255,255,0.04)",
  chipBorder: "rgba(255,255,255,0.08)",
  // Message styling
  messageUserBg: "#5FC4C0", // theme.primary
  messageUserText: "#FFFFFF",
  messageAiBg: "rgba(255,255,255,0.08)",
  messageAiText: "#FFFFFF",
  // Dark backdrop: subtle cyan/teal blooms over dark base
  backdropGradient: ["#1A3A3C", "#182D2F", "#182424"],
  backdropBloom1: "#5FC4C0",
  backdropBloom2: "#2BA89E",
  backdropBloom3: "#3BD0D2",
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

// ============================================================================
// BACKDROP COMPONENT PROPS TYPE
// ============================================================================

export type MiloBackdropMode = "light" | "dark";

/**
 * Optional: Pre-computed gradient props for each backdrop style.
 * Useful if you need to pass props directly to LinearGradient.
 */
export function getBackdropGradientProps(
  mode: MiloBackdropMode
): Pick<LinearGradientProps, "colors" | "locations" | "start" | "end"> {
  const tokens = mode === "light" ? MILO_LIGHT : MILO_DARK;
  return {
    colors: tokens.backdropGradient,
    locations: [0, 0.28, 1],
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  };
}
