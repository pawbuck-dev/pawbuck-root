import type { Theme } from "@/theme/model";

/** Surfaces aligned with PetJournalHomeCard. */
export function getPawthonSurfaceTokens(isDark: boolean, theme: Theme) {
  return {
    cardBackground: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
    insetBackground: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    subduedBackground: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    iconBadgeBackground: isDark ? "rgba(56, 189, 189, 0.2)" : "rgba(59, 208, 210, 0.18)",
    badgeBorder: isDark ? "rgba(38, 193, 193, 0.55)" : "rgba(11, 150, 150, 0.35)",
    badgeLabel: isDark ? "#7DD3D3" : "#0B9696",
    peachBanner: isDark ? "#2A2420" : "#FFF0E8",
    primaryForeground: theme.primaryForeground,
    primary: theme.primary,
  };
}
