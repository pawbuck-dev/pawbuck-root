import type { Theme } from "@/theme/model";

export const PROFILE_LIST_ROW_GAP = 22;
export const PROFILE_CARD_BORDER_LIGHT = "#E4E7E7";

/** Light profile list (high-res ref): white cards, gray wells, #757575 subtitles, soft chevrons */
export const PROFILE_LIST_SUBTITLE_LIGHT = "#757575";
export const PROFILE_LIST_CHEVRON_LIGHT = "#D1D1D1";
export const PROFILE_LIST_ICON_WELL_LIGHT = "#E0E0E0";
export const PROFILE_LIST_ICON_FG_LIGHT = "#111111";

/** @deprecated use PROFILE_LIST_SUBTITLE_LIGHT for list copy; kept for any legacy imports */
export const PROFILE_MUTED_LIGHT = PROFILE_LIST_SUBTITLE_LIGHT;

/** Shared profile screen surfaces & list row colors (Figma 1340:28729 / 1340:28732) */
export function getProfileScreenTokens(theme: Theme, isDark: boolean) {
  if (isDark) {
    const cardBorder = theme.border;
    const muted = theme.secondary;
    return {
      cardBorder,
      muted,
      profileCardBg: "rgba(255,255,255,0.06)",
      profileCardBorderStyle: {} as const,
      profileListIconWellBg: "rgba(255,255,255,0.1)",
      profileListIconColor: "#FFFFFF",
      profileListTitleColor: theme.foreground,
      profileListChevronColor: "#FFFFFF",
    };
  }

  const cardBorder = PROFILE_CARD_BORDER_LIGHT;
  return {
    cardBorder,
    muted: PROFILE_LIST_SUBTITLE_LIGHT,
    profileCardBg: "#FFFFFF",
    profileCardBorderStyle: { borderWidth: 1 as const, borderColor: cardBorder },
    profileListIconWellBg: PROFILE_LIST_ICON_WELL_LIGHT,
    profileListIconColor: PROFILE_LIST_ICON_FG_LIGHT,
    profileListTitleColor: PROFILE_LIST_ICON_FG_LIGHT,
    profileListChevronColor: PROFILE_LIST_CHEVRON_LIGHT,
  };
}

export type ProfileScreenTokens = ReturnType<typeof getProfileScreenTokens>;

/** Figma 1386:39634 — profile hero (stacked avatar + details, no overlap) */
export const PROFILE_HERO_OUTER_PADDING = 6;
export const PROFILE_HERO_AVATAR_SIZE = 180;
export const PROFILE_HERO_AVATAR_RING = 4;
/** Vertical gap between avatar and details block */
export const PROFILE_HERO_AVATAR_DETAILS_GAP = 16;
export const PROFILE_HERO_DETAILS_PADDING = 16;
export const PROFILE_HERO_SECTION_GAP = 20;
/** Label → value spacing (Apple-style tight header) */
export const PROFILE_HERO_NAME_LABEL_GAP = 6;

/** @deprecated Overlap removed — use PROFILE_HERO_AVATAR_DETAILS_GAP */
export const PROFILE_HERO_DETAILS_OVERLAP = 0;
/** @deprecated Details share outer tile radius */
export const PROFILE_HERO_DETAILS_RADIUS = 20;

export function getProfileHeroTokens(theme: Theme, isDark: boolean) {
  if (isDark) {
    return {
      avatarRingColor: "rgba(255,255,255,0.32)",
      editFabBg: "rgba(0,0,0,0.45)",
      editFabBorder: theme.border,
      editFabIcon: "#FFFFFF",
      lockedBadgeBg: "rgba(255,255,255,0.14)",
      lockedBadgeText: theme.secondary,
      placeholderGradient: [theme.primary, `${theme.primary}99`, "#1A3D3A"] as const,
    };
  }
  return {
    avatarRingColor: "#FFFFFF",
    editFabBg: "rgba(255,255,255,0.92)",
    editFabBorder: PROFILE_CARD_BORDER_LIGHT,
    editFabIcon: theme.primary,
    lockedBadgeBg: "#FFFFFF",
    lockedBadgeText: PROFILE_LIST_SUBTITLE_LIGHT,
    placeholderGradient: [theme.primary, `${theme.primary}CC`, "#B8E8E4"] as const,
  };
}
