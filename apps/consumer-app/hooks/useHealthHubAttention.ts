import { getVaccinationsByPetId } from "@/services/vaccinations";
import { countOverdueVaccinations } from "@/utils/healthHubAttention";
import { useQueries, useQuery } from "@tanstack/react-query";

/**
 * Per-pet badge counts for PetSelector (same query keys as hub data — deduped by React Query).
 */
export function usePetHealthNotificationCounts(petIds: string[]): Record<string, number> {
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
        map[id] = countOverdueVaccinations(rows);
      });
      return map;
    },
  });
}

export function useHealthAttentionForPet(petId: string | undefined) {
  const { data: vaccinations = [] } = useQuery({
    queryKey: ["vaccinations", petId],
    queryFn: () => getVaccinationsByPetId(petId!),
    enabled: !!petId,
  });

  const attentionCount = countOverdueVaccinations(vaccinations);

  const subtitle =
    attentionCount === 0
      ? ""
      : attentionCount === 1
        ? "1 overdue vaccine needs attention"
        : `${attentionCount} overdue vaccines need attention`;

  return { attentionCount, subtitle };
}
