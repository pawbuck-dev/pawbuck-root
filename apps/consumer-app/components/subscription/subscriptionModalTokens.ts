import type { Theme } from "@/theme/model";
import { getNavigationIconTier } from "@/constants/iconTierTokens";
import { Platform } from "react-native";

/** Same page shell as Contact, Care Team, Profile list screens */
export const SUBSCRIPTION_PAGE_BG_LIGHT = "#F5F7F8";

export function getSubscriptionModalTokens(theme: Theme, isDark: boolean) {
  const pageBg = isDark ? theme.background : SUBSCRIPTION_PAGE_BG_LIGHT;
  const nestedBg = isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF";
  const iconWellBg = getNavigationIconTier(isDark).wellBg;
  const scrim = "rgba(0,0,0,0.55)";
  const panelBorder =
    Platform.OS === "android"
      ? {}
      : {
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        };

  return {
    pageBg,
    nestedBg,
    iconWellBg,
    scrim,
    panelBorder,
    titleColor: isDark ? theme.foreground : "#111111",
    mutedColor: isDark ? theme.secondary : "#5A5F6A",
  };
}

export type SubscriptionModalTokens = ReturnType<typeof getSubscriptionModalTokens>;
