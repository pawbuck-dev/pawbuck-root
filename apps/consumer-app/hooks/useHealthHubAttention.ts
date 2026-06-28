import { usePets } from "@/context/petsContext";
import {
  computeRequiredVaccinesStatus,
  getVaccineEquivalencies,
  getVaccineRequirements,
} from "@/services/vaccineRequirements";
import { getVaccinationsByPetId } from "@/services/vaccinations";
import {
  buildHealthAttentionSubtitle,
  countMissingRequiredVaccines,
  countOverdueVaccinations,
} from "@/utils/healthHubAttention";
import { useQueries, useQuery } from "@tanstack/react-query";

/**
 * Per-pet health badge counts (missing required + overdue vaccines).
 * Prefer {@link useUnifiedPetNotificationCounts} for PetSelector chips app-wide.
 */
export function usePetHealthNotificationCounts(petIds: string[]): Record<string, number> {
  const { pets } = usePets();

  const { data: equivalencies = [] } = useQuery({
    queryKey: ["vaccineEquivalencies"],
    queryFn: getVaccineEquivalencies,
    staleTime: 1000 * 60 * 60,
  });

  const countryAnimalPairs = Array.from(
    new Set(
      petIds
        .map((id) => pets.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => !!p?.country && !!p?.animal_type)
        .map((p) => `${p.country}|${p.animal_type}`)
    )
  );

  const requirementQueries = useQueries({
    queries: countryAnimalPairs.map((pair) => {
      const [country, animalType] = pair.split("|");
      return {
        queryKey: ["vaccineRequirements", country, animalType],
        queryFn: () => getVaccineRequirements(country, animalType),
        staleTime: 1000 * 60 * 60,
      };
    }),
  });

  const requirementsByPair = new Map<string, Awaited<ReturnType<typeof getVaccineRequirements>>>();
  countryAnimalPairs.forEach((pair, i) => {
    if (requirementQueries[i]?.data) {
      requirementsByPair.set(pair, requirementQueries[i].data!);
    }
  });

  return useQueries({
    queries: petIds.map((petId) => ({
      queryKey: ["vaccinations", petId],
      queryFn: () => getVaccinationsByPetId(petId),
      enabled: !!petId,
    })),
    combine: (results) => {
      const map: Record<string, number> = {};
      petIds.forEach((id, i) => {
        const rows = results[i]?.data ?? [];
        const pet = pets.find((p) => p.id === id);
        const overdue = countOverdueVaccinations(rows);

        let missingRequired = 0;
        if (pet?.country && pet?.animal_type) {
          const pair = `${pet.country}|${pet.animal_type}`;
          const requirements = requirementsByPair.get(pair) ?? [];
          if (requirements.length > 0) {
            const status = computeRequiredVaccinesStatus(rows, requirements, equivalencies);
            missingRequired = countMissingRequiredVaccines(status);
          }
        }

        map[id] = missingRequired + overdue;
      });
      return map;
    },
  });
}

export function useHealthAttentionForPet(petId: string | undefined) {
  const { pets } = usePets();
  const pet = pets.find((p) => p.id === petId);

  const { data: vaccinations = [] } = useQuery({
    queryKey: ["vaccinations", petId],
    queryFn: () => getVaccinationsByPetId(petId!),
    enabled: !!petId,
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ["vaccineRequirements", pet?.country, pet?.animal_type],
    queryFn: () => getVaccineRequirements(pet!.country!, pet!.animal_type!),
    enabled: !!pet?.country && !!pet?.animal_type,
    staleTime: 1000 * 60 * 60,
  });

  const { data: equivalencies = [] } = useQuery({
    queryKey: ["vaccineEquivalencies"],
    queryFn: getVaccineEquivalencies,
    staleTime: 1000 * 60 * 60,
  });

  const overdue = countOverdueVaccinations(vaccinations);
  const requiredStatus =
    pet?.country && pet?.animal_type && requirements.length > 0
      ? computeRequiredVaccinesStatus(vaccinations, requirements, equivalencies)
      : { total: 0, administered: 0, missing: [], administeredList: [] };

  const missingRequired = countMissingRequiredVaccines(requiredStatus);
  const attentionCount = missingRequired + overdue;
  const subtitle = buildHealthAttentionSubtitle(missingRequired, overdue);

  return { attentionCount, subtitle };
}
