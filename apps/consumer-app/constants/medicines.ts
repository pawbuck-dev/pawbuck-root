export enum MEDICATION_TYPES {
  TABLET = "Tablet",
  CAPSULE = "Capsule",
  LIQUID = "Liquid",
  INJECTION = "Injection",
  TOPICAL = "Topical",
  CHEWABLE = "Chewable",
  OTHER = "Other",
}

/** Figma Add Medicine (1386:44525) — dropdown order */
export const MEDICATION_TYPES_PICKER_ORDER: MEDICATION_TYPES[] = [
  MEDICATION_TYPES.TABLET,
  MEDICATION_TYPES.LIQUID,
  MEDICATION_TYPES.INJECTION,
  MEDICATION_TYPES.TOPICAL,
  MEDICATION_TYPES.CAPSULE,
  MEDICATION_TYPES.CHEWABLE,
  MEDICATION_TYPES.OTHER,
];

export function medicationTypeLabel(type: MEDICATION_TYPES): string {
  return type === MEDICATION_TYPES.OTHER ? "Others" : type;
}
