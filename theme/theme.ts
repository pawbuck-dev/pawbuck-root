/**
 * PawBuck design tokens — colors and typography.
 * Replace values with your Figma variables when available.
 * (Figma Variables API required file_variables:read scope; paste exported tokens here.)
 */

export type { Theme } from "./model";
export { lightTheme } from "./light";
export { darkTheme } from "./dark";

/** Typography tokens — map from Figma text styles (e.g. Typography • Colors • Spacing page). */
export const typography = {
  fontFamily: {
    regular: "Poppins_400Regular",
    medium: "Poppins_500Medium",
    semibold: "Poppins_600SemiBold",
    bold: "Poppins_700Bold",
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;
