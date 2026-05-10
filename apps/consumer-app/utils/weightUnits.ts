export type WeightUnit = "lbs" | "kg";

export function kgToLbs(kg: number): number {
  return kg * 2.2046226218;
}

export function lbsToKg(lbs: number): number {
  return lbs / 2.2046226218;
}

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  return from === "kg" ? kgToLbs(value) : lbsToKg(value);
}

export function formatWeight(value: number, unit: WeightUnit): string {
  const n = unit === "kg" ? Math.round(value * 10) / 10 : Math.round(value * 10) / 10;
  return `${n}`;
}

/** Display-only: one decimal place (Swift `String(format: "%.1f", weight)` style). */
export function formatWeightOneDecimal(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

/** Pet profile / briefing: formatted number + unit; does not alter stored values. */
export function formatPetWeightForDisplay(
  weightValue: number | null | undefined,
  weightUnit: string | null | undefined
): string | null {
  if (weightValue == null || !(weightValue > 0)) return null;
  const n = formatWeightOneDecimal(weightValue);
  const u = weightUnit?.trim();
  return u ? `${n} ${u}` : n;
}
