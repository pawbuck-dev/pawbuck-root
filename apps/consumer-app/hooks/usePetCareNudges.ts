import { buildPetCareNudges } from "@/services/careNudges/fromPetRecords";
import {
  fetchCareNudgeDismissals,
  filterNudgesWithDismissals,
  snoozeCareNudge,
} from "@/services/careNudges/dismissals";
import type { RequiredVaccinesStatus } from "@/services/vaccineRequirements";
import type { MedicineData } from "@/types/medication";
import type { Tables } from "@/database.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { careNudgeToListItem } from "@/components/home/CareNudgeTodayList";

export function usePetCareNudges(input: {
  userId: string | undefined;
  petId: string | undefined;
  petName?: string;
  petCountry?: string | null;
  vaccinations: Pick<Tables<"vaccinations">, "id" | "name" | "date" | "next_due_date">[];
  medicines: MedicineData[];
  requiredStatus?: RequiredVaccinesStatus | null;
  limit?: number;
}) {
  const queryClient = useQueryClient();
  const limit = input.limit ?? 3;

  const { data: dismissals = [] } = useQuery({
    queryKey: ["careNudgeDismissals", input.userId],
    queryFn: () => fetchCareNudgeDismissals(input.userId!),
    enabled: !!input.userId,
    staleTime: 60_000,
  });

  const nudges = useMemo(() => {
    if (!input.petId) return [];
    const raw = buildPetCareNudges({
      petId: input.petId,
      petName: input.petName,
      petCountry: input.petCountry,
      vaccinations: input.vaccinations,
      medicines: input.medicines,
      requiredStatus: input.requiredStatus,
    });
    return filterNudgesWithDismissals(raw, dismissals).slice(0, limit).map(careNudgeToListItem);
  }, [
    input.petId,
    input.petName,
    input.petCountry,
    input.vaccinations,
    input.medicines,
    input.requiredStatus,
    dismissals,
    limit,
  ]);

  const dismissMutation = useMutation({
    mutationFn: async (nudgeKind: string) => {
      if (!input.userId || !input.petId) return;
      await snoozeCareNudge({
        userId: input.userId,
        petId: input.petId,
        nudgeKind,
        snoozeDays: 7,
      });
    },
    onSuccess: async () => {
      if (input.userId) {
        await queryClient.invalidateQueries({ queryKey: ["careNudgeDismissals", input.userId] });
      }
    },
  });

  const dismiss = useCallback(
    (kind: string) => {
      dismissMutation.mutate(kind);
    },
    [dismissMutation]
  );

  return { nudges, dismiss, dismissing: dismissMutation.isPending };
}
