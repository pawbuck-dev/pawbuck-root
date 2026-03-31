/**
 * Possessive screen titles, e.g. "Max's Health Records", "Max's Labs".
 * If the pet name is missing, returns `phrase` unchanged.
 */
export function petPossessiveLabel(petName: string | null | undefined, phrase: string): string {
  const n = petName?.trim();
  if (!n) return phrase;
  return `${n}'s ${phrase}`;
}
