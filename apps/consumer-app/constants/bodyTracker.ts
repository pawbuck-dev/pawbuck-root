/** Stool observation tags — stored on daily_intake.poop_tags */
export const POOP_OUTPUT_TAGS = [
  "Normal",
  "Soft",
  "Hard",
  "Mucus",
  "Blood",
  "Unusual color",
] as const;

/** Urination observation tags — stored on daily_intake.pee_tags */
export const PEE_OUTPUT_TAGS = [
  "Normal",
  "Frequent",
  "Straining",
  "Unusual color",
  "Accidents",
] as const;
