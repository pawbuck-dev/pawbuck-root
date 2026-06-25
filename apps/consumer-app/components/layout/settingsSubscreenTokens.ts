import type { Theme } from "@/theme/model";
import { getNavigationIconTier } from "@/constants/iconTierTokens";
import { Platform } from "react-native";

export const SETTINGS_PAGE_BG_LIGHT = "#F5F7F8";

export type SettingsSubscreenTokens = ReturnType<typeof getSettingsSubscreenTokens>;

/** Shared surfaces for Profile sub-screens (Contact, Privacy, Pet Profile, Transfer, etc.) */
export function getSettingsSubscreenTokens(theme: Theme, isDark: boolean) {
  const pageBg = isDark ? theme.background : SETTINGS_PAGE_BG_LIGHT;
  const title = isDark ? theme.foreground : "#111111";
  const muted = isDark ? "rgba(255,255,255,0.55)" : "#757575";
  const bodyMuted = isDark ? "rgba(255,255,255,0.6)" : "#5A5F6A";
  const backFabBg = isDark ? theme.card : "#FFFFFF";
  const navIcon = getNavigationIconTier(isDark);
  const iconWellBg = navIcon.wellBg;
  const iconFg = navIcon.glyphColor;
  const tileBg = isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF";
  const nestedBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.045)";
  const listCardBg = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";
  const borderSubtle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const lockedBadgeBg = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.06)";

  const tileBorder =
    Platform.OS === "android"
      ? {}
      : {
          borderWidth: 1 as const,
          borderColor: borderSubtle,
        };

  return {
    pageBg,
    title,
    muted,
    bodyMuted,
    backFabBg,
    iconWellBg,
    iconFg,
    tileBg,
    nestedBg,
    listCardBg,
    borderSubtle,
    lockedBadgeBg,
    tileBorder,
    contentPaddingH: 20,
    tileRadius: 24,
    rowRadius: 16,
  };
}
