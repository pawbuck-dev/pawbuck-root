/**
 * PawBuck App Redesign — health records (vaccines, medications, labs).
 * Single source for Figma-aligned layout + surfaces. Dev-mode refs:
 * - Vaccines list/detail: 1386:44967, 1386:44644
 * - Medications list/detail: 1340:33846, 1340:33523
 * - Med/vacc list card (dark): 1340:33857 — canvas behind cards uses darker well vs elevated card
 * - Vaccines hub / glyph (teal disc + white heart-pulse): 1340:33860
 * - List card overflow (⋯) dark: 1340:33864 — circular control; stronger white tint than card (not 6%)
 * - Dark tokens: theme/dark.ts (#182424, #1C2128, #5FC4C0, #30363D, backgroundEnd #121C1C)
 */
import type { Theme } from "@/theme/model";
import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";

export const FIGMA_HEALTH_TEAL = "#3BD0D2";
/** Solid disc + white glyph (same pattern as vaccines / 1340:33860) */
export const FIGMA_HEALTH_MEDS_ICON_BG = "#2563EB";
export const FIGMA_HEALTH_EXAMS_ICON_BG = "#EA580C";
export const FIGMA_HEALTH_LABS_ICON_BG = "#16A34A";
/** Detail screens (vaccines, meds) — light mode canvas */
export const FIGMA_MINT_SCREEN_LIGHT = "#F2F9F8";

/** Vaccines list screen (Figma 2082:213157) — canvas behind white cards */
export const FIGMA_VACCINES_LIST_CANVAS_LIGHT = "#F5F7F7";

/** Vaccination detail (Figma 1386:44644) — screen canvas */
export const FIGMA_VACCINATION_DETAIL_BG_LIGHT = "#F4F7F6";

/** List tab: white elevated cards on #F2F7F7 (theme.background) */
const LIST_CARD_LIGHT = "#FFFFFF";
const LIST_CARD_BORDER_LIGHT = "rgba(0,0,0,0.06)";
const ICON_PLATE_LIGHT = "#F3F4F6";
const ICON_INK_LIGHT = "#1D2433";
const OVERFLOW_BTN_LIGHT = "#F3F4F6";
const DIVIDER_LIGHT = "#EEF2F6";
const HEADER_BTN_LIGHT = "#FFFFFF";

const ICON_PLATE_DARK = "rgba(255,255,255,0.08)";
const HEADER_BTN_DARK = "rgba(255,255,255,0.08)";
const DIVIDER_DARK = "rgba(255,255,255,0.08)";
/** Vaccine/med list cards — Figma: fill = white @ 6% over tab canvas (not solid theme.card) */
export const FIGMA_HEALTH_LIST_CARD_FILL_DARK = "rgba(255, 255, 255, 0.06)";
/**
 * Card overflow (vertical ⋯) — sits on 6% card; Figma uses ~10–12% white so it reads as a control.
 * Node 1340:33864
 */
export const FIGMA_HEALTH_OVERFLOW_BTN_DARK = "rgba(255, 255, 255, 0.12)";
const LIST_CARD_BORDER_DARK = "rgba(255, 255, 255, 0.08)";

export const HEALTH_ELEVATION = {
  cardLight: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  } satisfies ViewStyle,
};

/** Spacing & radii — 4px grid */
export const HEALTH_LAYOUT = {
  screenPaddingX: 16,
  screenPaddingBottom: 28,
  headerTopPad: 8,
  headerBottomPad: 10,
  sectionTitleMarginBottom: 12,
  cardPadding: 16,
  cardGap: 12,
  cardRadius: 20,
  detailCardRadius: 22,
  /** Stacked cards on vaccine/med detail */
  detailCardPadding: 18,
  detailSummaryIconGap: 14,
  notesRadius: 14,
  notesPadding: 14,
  notesTitleGap: 10,
  /** Vertical space between stacked detail cards */
  detailSectionGap: 12,
  /** Space between field groups inside a card */
  fieldStackGap: 14,
  iconPlate: { size: 44, radius: 22 },
  iconPlateDetail: { size: 56, radius: 28 },
  overflow: { size: 36, radius: 18 },
  headerCircle: { size: 40, radius: 20 },
  /** Icon plate per row inside detail cards */
  detailRowIcon: { size: 40, radius: 20, marginRight: 12 },
  emptyHero: { circle: 128, icon: 64 },
  /** Row under title: icon + columns */
  columnsMarginTop: 16,
  clinicFooterMarginTop: 14,
  clinicFooterPaddingTop: 14,
  titleToBadgeGap: 6,
  titleBlockEndPadding: 8,
  iconToTitleGap: 12,
} as const;

export const HEALTH_TYPE = {
  /** List card title */
  cardTitle: { fontSize: 17, fontWeight: "700" } satisfies TextStyle,
  /** Detail header (nav bar) */
  navTitle: { fontSize: 17, fontWeight: "700" } satisfies TextStyle,
  /** Detail summary name */
  detailTitle: { fontSize: 22, fontWeight: "700" } satisfies TextStyle,
  detailSubtitle: { fontSize: 14, fontWeight: "500" } satisfies TextStyle,
  /** Section heading inside stacked cards */
  cardSection: { fontSize: 15, fontWeight: "600" } satisfies TextStyle,
  fieldLabel: { fontSize: 11, fontWeight: "500" } satisfies TextStyle,
  fieldValue: { fontSize: 14, fontWeight: "600" } satisfies TextStyle,
  /** Detail screen rows (slightly larger than list card columns) */
  detailFieldLabel: { fontSize: 12, fontWeight: "500" } satisfies TextStyle,
  detailFieldValue: { fontSize: 16, fontWeight: "600" } satisfies TextStyle,
  badge: { fontSize: 12, fontWeight: "600" } satisfies TextStyle,
  notesBody: { fontSize: 15, lineHeight: 22 } satisfies TextStyle,
  documentTitle: { fontSize: 16, fontWeight: "700" } satisfies TextStyle,
  documentHint: { fontSize: 13 } satisfies TextStyle,
  purposeItalic: { fontSize: 13, fontStyle: "italic" } satisfies TextStyle,
} as const;

export function healthDetailScreenBg(theme: Theme, isDark: boolean): string {
  return isDark ? theme.background : FIGMA_MINT_SCREEN_LIGHT;
}

/**
 * Health Record tabs (Vaccines/Meds/Exams/Labs): Figma uses a darker canvas behind
 * elevated cards in dark mode — `backgroundEnd` (#121C1C), not the main app shell (#182424).
 */
export function healthRecordTabCanvas(theme: Theme, isDark: boolean): string {
  return isDark ? theme.backgroundEnd : theme.background;
}

export function healthListCardChrome(theme: Theme, isDark: boolean) {
  return {
    cardBg: isDark ? FIGMA_HEALTH_LIST_CARD_FILL_DARK : LIST_CARD_LIGHT,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: isDark ? LIST_CARD_BORDER_DARK : LIST_CARD_BORDER_LIGHT,
    iconPlate: isDark ? ICON_PLATE_DARK : ICON_PLATE_LIGHT,
    iconInk: isDark ? theme.foreground : ICON_INK_LIGHT,
    overflowBtnBg: isDark ? FIGMA_HEALTH_OVERFLOW_BTN_DARK : OVERFLOW_BTN_LIGHT,
    divider: isDark ? DIVIDER_DARK : DIVIDER_LIGHT,
  };
}

export function healthDetailHeaderChrome(theme: Theme, isDark: boolean) {
  return {
    headerBtnBg: isDark ? HEADER_BTN_DARK : HEADER_BTN_LIGHT,
    headerBtnBorder: isDark ? "transparent" : LIST_CARD_BORDER_LIGHT,
    headerBtnBorderWidth: isDark ? 0 : StyleSheet.hairlineWidth,
  };
}

export function healthDetailCardChrome(theme: Theme, isDark: boolean) {
  const outline: ViewStyle = isDark
    ? { borderWidth: 1, borderColor: theme.border }
    : {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: LIST_CARD_BORDER_LIGHT,
      };
  const shadow: ViewStyle = isDark ? {} : HEALTH_ELEVATION.cardLight;
  return {
    cardBg: theme.card,
    iconPlate: isDark ? ICON_PLATE_DARK : ICON_PLATE_LIGHT,
    iconInk: isDark ? theme.foreground : ICON_INK_LIGHT,
    notesBubbleBg: isDark ? "rgba(255,255,255,0.06)" : ICON_PLATE_LIGHT,
    outline,
    shadow,
  };
}
