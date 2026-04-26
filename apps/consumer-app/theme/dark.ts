import { Theme } from "./model";

/** Figma UI Design (Dark) — e.g. onboarding/sign in 1340:30146, 1340:31106 */
export const darkTheme: Theme = {
  background: "#0B0F14",
  /** Kept in sync with `background` so shell + any gradient endpoints stay one color */
  backgroundEnd: "#0B0F14",
  foreground: "#FFFFFF",

  card: "#18222D",
  cardForeground: "#FFFFFF",

  primary: "#5FC4C0",
  primaryForeground: "#0F1419",

  secondary: "#9CA3AF",
  secondaryForeground: "#FFFFFF",

  border: "#30363D",
  ring: "#5FC4C0",
  dashedCard: "#161B22",

  error: "#EF4444",
  warning: "#F59E0B",
};
