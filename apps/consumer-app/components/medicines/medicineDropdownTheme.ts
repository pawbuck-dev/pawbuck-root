import type { Theme } from "@/theme/model";

/**
 * Figma Health Records — dropdown / “more” menu (node 1340:33428, context rows 362:2122).
 * Dark: panel #535A5A, row pills white @ 8% when selected, 14px regular label, 20px check.
 */
export const MEDICINE_DROPDOWN = {
  panelRadius: 16,
  rowRadius: 14,
  rowPaddingV: 12,
  rowPaddingH: 12,
  rowGap: 4,
  listPaddingH: 12,
  listPaddingV: 8,
  labelFontSize: 14,
  checkSize: 20,
  sheetMaxHeight: "70%" as const,
} as const;

const PANEL_DARK = "#535A5A";

export type MedicineDropdownPalette = {
  panelBg: string;
  titleColor: string;
  rowSelectedBg: string;
  rowLabelColor: string;
  rowLabelColorMuted: string;
  checkColor: string;
  checkPlaceholderVisible: boolean;
};

export function medicineDropdownPalette(
  theme: Theme,
  isDark: boolean
): MedicineDropdownPalette {
  if (isDark) {
    return {
      panelBg: PANEL_DARK,
      titleColor: "#FFFFFF",
      rowSelectedBg: "rgba(255,255,255,0.12)",
      rowLabelColor: "#FFFFFF",
      rowLabelColorMuted: "#FFFFFF",
      checkColor: "#FFFFFF",
      checkPlaceholderVisible: false,
    };
  }
  return {
    panelBg: theme.card,
    titleColor: theme.foreground,
    rowSelectedBg: "rgba(0,0,0,0.05)",
    rowLabelColor: theme.foreground,
    rowLabelColorMuted: theme.secondary,
    checkColor: theme.primary,
    checkPlaceholderVisible: false,
  };
}
