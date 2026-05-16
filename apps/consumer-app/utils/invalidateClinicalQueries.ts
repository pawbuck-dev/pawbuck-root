import type { QueryClient } from "@tanstack/react-query";

/** Refresh hub cards and category tabs after Milo document analyze + clinical sync. */
export async function invalidateClinicalQueries(queryClient: QueryClient, petId: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["pet_documents", petId] }),
    queryClient.invalidateQueries({ queryKey: ["vaccinations", petId] }),
    queryClient.invalidateQueries({ queryKey: ["medicines", petId] }),
    queryClient.invalidateQueries({ queryKey: ["clinicalExams", petId] }),
    queryClient.invalidateQueries({ queryKey: ["labResults", petId] }),
  ]);
}
