import type { Pet } from "@/context/petsContext";

/** Toggle a pet id in a multi-select list (always keeps at least one selected when toggling off). */
export function toggleWalkPetId(selectedIds: string[], id: string): string[] {
  if (selectedIds.includes(id)) {
    if (selectedIds.length <= 1) return selectedIds;
    return selectedIds.filter((x) => x !== id);
  }
  return [...selectedIds, id];
}

/** Format pet names for walk UI: "Luna", "Luna & Max", "Luna, Max & Buddy". */
export function formatWalkPetNames(pets: Pick<Pet, "name">[]): string {
  const names = pets.map((p) => p.name.trim()).filter(Boolean);
  if (names.length === 0) return "your pets";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/** CTA label for starting a walk with selected pets. */
export function formatStartWalkCta(pets: Pick<Pet, "name">[]): string {
  const names = formatWalkPetNames(pets);
  if (pets.length <= 1) return "Start a Walk";
  return `Start walk with ${names}`;
}
