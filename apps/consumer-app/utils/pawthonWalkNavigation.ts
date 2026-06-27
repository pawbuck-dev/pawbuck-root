/** Route params for Pawthon walk — auto-start only when exactly one pet. */
export function pawthonWalkStartRoute(pets: { id: string }[], selectedPetId: string | null) {
  if (pets.length === 1) {
    return {
      pathname: "/pawthon-walk" as const,
      params: { autoStart: "1", petId: pets[0]!.id },
    };
  }
  if (selectedPetId && pets.some((p) => p.id === selectedPetId)) {
    return {
      pathname: "/pawthon-walk" as const,
      params: { petId: selectedPetId },
    };
  }
  return { pathname: "/pawthon-walk" as const };
}
