/**
 * Layout constants from Figma Mobile Elements (Component Library).
 * Status bar (29:151): Theme Light/Dark, 52pt height, padding 28 L/R, 20 T/B.
 * Home indicator (29:192): 28pt height, 16pt top / 8pt bottom padding, pill 110×4pt.
 */

export const FIGMA_STATUS_BAR = {
  /** Total height of status bar container in Figma (pt). */
  height: 52,
  paddingHorizontal: 28,
  paddingTop: 20,
  paddingBottom: 20,
  /** Inner status row height (pt). */
  contentHeight: 12,
} as const;

export const FIGMA_HOME_INDICATOR = {
  /** Total height of home indicator container (pt). */
  height: 28,
  paddingTop: 16,
  paddingBottom: 8,
  /** Pill dimensions (pt). Light = #0D0F0F, Dark = white. */
  pillWidth: 110,
  pillHeight: 4,
  pillBorderRadius: 1000,
} as const;
