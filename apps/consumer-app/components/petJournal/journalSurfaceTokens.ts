import type { Theme } from "@/theme/model";

/** Surfaces aligned with PetJournalHomeCard (home journal row). */
export function getJournalSurfaceTokens(isDark: boolean, theme: Theme) {
  return {
    cardBackground: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
    insetBackground: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
    subduedBackground: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
    iconBadgeBackground: isDark ? "rgba(56, 189, 189, 0.2)" : "rgba(59, 208, 210, 0.18)",
    primaryChipBackground: theme.primary,
    primaryChipForeground: theme.primaryForeground,
    mutedChipBackground: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    mutedChipForeground: theme.foreground,
  };
}
