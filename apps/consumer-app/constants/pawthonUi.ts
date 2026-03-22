/** Figma Pawthon accent (screenshots ~Mar 2026). */
export const PAWTHON_TEAL = "#26C1C1";
export const PAWTHON_TEAL_DARK = "#1FA8A8";
export const PAWTHON_ORANGE_BANNER_BG = "#FFF4ED";
export const PAWTHON_ORANGE_BANNER_TEXT = "#5C4033";
export const PAWTHON_PEACH_CARD = "#FFF0E8";
export const PAWTHON_PLACEHOLDER_STRIPE_A = "#FFE4EC";
export const PAWTHON_PLACEHOLDER_STRIPE_B = "#FFFFFF";

export function metersToMiles(m: number): number {
  return m * 0.000621371;
}

export function formatMiles(miles: number): string {
  if (miles < 10) return miles.toFixed(2);
  return miles.toFixed(1);
}

/** Minutes per mile; 0 if invalid. */
export function paceMinPerMile(durationSec: number, miles: number): number {
  if (miles <= 0.001 || durationSec <= 0) return 0;
  return durationSec / 60 / miles;
}

export function formatPace(minPerMile: number): string {
  if (minPerMile <= 0 || !Number.isFinite(minPerMile)) return "—";
  const m = Math.floor(minPerMile);
  const s = Math.round((minPerMile - m) * 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDurationWalk(sec: number): string {
  if (sec < 60) return `${sec} sec`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}
