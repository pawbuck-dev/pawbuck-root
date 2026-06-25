/**
 * Apple-style 3-tier icon system — Tier A (navigation) + Tier B (domain categories, B1 tinted well).
 * Health hub colors align with figmaHealthLayout; document categories match DocumentsAndIdSection.
 */
import {
  FIGMA_HEALTH_EXAMS_ICON_BG,
  FIGMA_HEALTH_LABS_ICON_BG,
  FIGMA_HEALTH_TEAL,
} from "@/constants/figmaHealthLayout";
import type { Ionicons } from "@expo/vector-icons";
import type { MaterialCommunityIcons } from "@expo/vector-icons";

export type IconWellSize = "sm" | "md" | "lg" | "xl" | "hero";

/** Circular well diameter + matching glyph size (4px grid). */
export const ICON_WELL_SIZES = {
  sm: { well: 28, icon: 16 },
  md: { well: 40, icon: 20 },
  lg: { well: 44, icon: 22 },
  xl: { well: 56, icon: 26 },
  /** Empty-state hero circles on health tabs */
  hero: { well: 128, icon: 56 },
} as const;

export type IconTierTokens = {
  wellBg: string;
  glyphColor: string;
};

export type DomainCategoryId =
  | "vaccines"
  | "medications"
  | "clinical_visits"
  | "labs"
  | "microchip"
  | "insurance"
  | "pedigree"
  | "certificates"
  | "travel";

export const DOMAIN_CATEGORY_IDS: DomainCategoryId[] = [
  "vaccines",
  "medications",
  "clinical_visits",
  "labs",
  "microchip",
  "insurance",
  "pedigree",
  "certificates",
  "travel",
];

export type HubCardType = "vaccine" | "med" | "exam" | "lab";

type DomainCategoryPalette = {
  wellLight: string;
  wellDark: string;
  glyphLight: string;
  glyphDark: string;
};

/** B1 — tinted well + category-colored glyph (dark and light). */
const DOMAIN_CATEGORY_PALETTES: Record<DomainCategoryId, DomainCategoryPalette> = {
  vaccines: {
    wellLight: "rgba(59,208,210,0.15)",
    wellDark: "rgba(59,208,210,0.2)",
    glyphLight: "#0E7490",
    glyphDark: FIGMA_HEALTH_TEAL,
  },
  medications: {
    wellLight: "rgba(37,99,235,0.12)",
    wellDark: "rgba(37,99,235,0.22)",
    glyphLight: "#1D4ED8",
    glyphDark: "#93C5FD",
  },
  clinical_visits: {
    wellLight: "rgba(234,88,12,0.14)",
    wellDark: "rgba(234,88,12,0.22)",
    glyphLight: FIGMA_HEALTH_EXAMS_ICON_BG,
    glyphDark: "#FB923C",
  },
  labs: {
    wellLight: "rgba(22,163,74,0.12)",
    wellDark: "rgba(22,163,74,0.22)",
    glyphLight: FIGMA_HEALTH_LABS_ICON_BG,
    glyphDark: "#4ADE80",
  },
  microchip: {
    wellLight: "rgba(109,40,217,0.12)",
    wellDark: "rgba(167,139,250,0.18)",
    glyphLight: "#6D28D9",
    glyphDark: "#C4B5FD",
  },
  insurance: {
    wellLight: "rgba(21,128,61,0.12)",
    wellDark: "rgba(34,197,94,0.2)",
    glyphLight: "#15803D",
    glyphDark: "#4ADE80",
  },
  pedigree: {
    wellLight: "rgba(180,83,9,0.14)",
    wellDark: "rgba(251,191,36,0.2)",
    glyphLight: "#B45309",
    glyphDark: "#FBBF24",
  },
  certificates: {
    wellLight: "rgba(219,39,119,0.12)",
    wellDark: "rgba(244,114,182,0.18)",
    glyphLight: "#DB2777",
    glyphDark: "#F472B6",
  },
  travel: {
    wellLight: "rgba(13,148,136,0.12)",
    wellDark: "rgba(45,212,191,0.18)",
    glyphLight: "#0D9488",
    glyphDark: "#2DD4BF",
  },
};

export type DomainCategoryDefaultIcon =
  | {
      kind: "material";
      name: keyof typeof MaterialCommunityIcons.glyphMap;
    }
  | {
      kind: "ion";
      name: keyof typeof Ionicons.glyphMap;
    };

/** Default glyphs per domain category (overridable in IconWell). */
export const DOMAIN_CATEGORY_DEFAULT_ICONS: Record<DomainCategoryId, DomainCategoryDefaultIcon> = {
  vaccines: { kind: "material", name: "heart-pulse" },
  medications: { kind: "material", name: "pill" },
  clinical_visits: { kind: "material", name: "stethoscope" },
  labs: { kind: "ion", name: "flask" },
  microchip: { kind: "material", name: "chip" },
  insurance: { kind: "ion", name: "shield-checkmark" },
  pedigree: { kind: "material", name: "crown" },
  certificates: { kind: "material", name: "certificate-outline" },
  travel: { kind: "ion", name: "airplane-outline" },
};

/** Tier A — neutral navigation wells (settings rows, profile lists, tabs). */
export function getNavigationIconTier(isDark: boolean): IconTierTokens {
  if (isDark) {
    return {
      wellBg: "rgba(255,255,255,0.1)",
      glyphColor: "#FFFFFF",
    };
  }
  return {
    wellBg: "#E0E0E0",
    glyphColor: "#111111",
  };
}

/** Tier B — domain category wells (B1 tinted fill + colored glyph). */
export function getDomainCategoryIconTier(
  category: DomainCategoryId,
  isDark: boolean
): IconTierTokens {
  const palette = DOMAIN_CATEGORY_PALETTES[category];
  return {
    wellBg: isDark ? palette.wellDark : palette.wellLight,
    glyphColor: isDark ? palette.glyphDark : palette.glyphLight,
  };
}

/** Map Health Records hub card types to domain categories. */
export function hubCardTypeToDomainCategory(type: HubCardType): DomainCategoryId {
  const map: Record<HubCardType, DomainCategoryId> = {
    vaccine: "vaccines",
    med: "medications",
    exam: "clinical_visits",
    lab: "labs",
  };
  return map[type];
}
