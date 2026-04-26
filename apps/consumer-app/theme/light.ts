import { Theme } from "./model";

/** Figma UI Design (Light) — e.g. onboarding/sign in 1386:41126, 1386:42025; profile list ref #F5F7F8 */
export const lightTheme: Theme = {
  background: "#F5F7F8",
  backgroundEnd: "#EEF2F4",

  // Dark blue-gray text - hsl(220, 25%, 15%)
  foreground: "#1D2433",

  // Slightly tinted card bg - hsl(180, 15%, 95%)
  card: "#EEF4F4",
  cardForeground: "#1D2433",

  // Teal brand color - hsl(175, 60%, 42%)
  primary: "#2BA89E",
  primaryForeground: "#FFFFFF",

  // Gray text - hsl(220, 15%, 45%)
  secondary: "#616E82",
  secondaryForeground: "#1D2433",

  // Muted border - hsl(180, 10%, 88%)
  border: "#D9E0E0",

  // Lighter teal for glow - hsl(175, 55%, 52%)
  ring: "#4EC4B9",

  // Glassmorphism card - hsl(180, 15%, 92%)
  dashedCard: "#E4ECEC",

  error: "#EF4444",
  warning: "#D97706",
};
