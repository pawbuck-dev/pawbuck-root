/** Stool observation tags — stored on daily_intake.poop_tags */
export const POOP_OUTPUT_TAGS = [
  "Normal",
  "Soft",
  "Hard",
  "Mucus",
  "Blood",
  "Unusual color",
] as const;

/** When any of these poop tags are selected, the UI offers an optional note + photo. */
export const POOP_TAGS_REQUIRING_OBSERVATION = ["Mucus", "Blood", "Unusual color"] as const;

/** Urination observation tags — stored on daily_intake.pee_tags */
export const PEE_OUTPUT_TAGS = [
  "Normal",
  "Frequent",
  "Straining",
  "Unusual color",
  "Accidents",
] as const;

/** When this pee tag is selected, the UI offers an optional note + photo. */
export const PEE_TAGS_REQUIRING_OBSERVATION = ["Unusual color"] as const;

export function poopNeedsObservationDetail(tags: readonly string[]): boolean {
  return tags.some((t) =>
    (POOP_TAGS_REQUIRING_OBSERVATION as readonly string[]).includes(t)
  );
}

export function peeNeedsObservationDetail(tags: readonly string[]): boolean {
  return tags.some((t) =>
    (PEE_TAGS_REQUIRING_OBSERVATION as readonly string[]).includes(t)
  );
}
