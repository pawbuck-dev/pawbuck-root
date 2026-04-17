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
