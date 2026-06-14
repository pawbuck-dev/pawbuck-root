import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SupportApiError } from "@/api/supportClient";
import { useAdminApp } from "@/context/AdminAppContext";

export const supportQueryKeys = {
  all: ["support"] as const,
  metrics: () => [...supportQueryKeys.all, "metrics"] as const,
  queuesSummary: () => [...supportQueryKeys.all, "queues", "summary"] as const,
  subscriptionPlanBreakdown: () => [...supportQueryKeys.all, "subscription", "plan-breakdown"] as const,
  opsHealth: () => [...supportQueryKeys.all, "ops", "health"] as const,
  opsAvailability: (days: number) => [...supportQueryKeys.all, "ops", "availability", days] as const,
};

const REFETCH_MS = 60_000;
const OPS_REFETCH_MS = 60_000;

export function useSupportMetrics() {
  const { client } = useAdminApp();
  return useQuery({
    queryKey: supportQueryKeys.metrics(),
    queryFn: () => client.getMetrics(),
    refetchInterval: REFETCH_MS,
  });
}

export function useQueuesSummary() {
  const { client } = useAdminApp();
  return useQuery({
    queryKey: supportQueryKeys.queuesSummary(),
    queryFn: () => client.getQueuesSummary(),
    refetchInterval: REFETCH_MS,
  });
}

export function useSubscriptionPlanBreakdown() {
  const { client } = useAdminApp();
  return useQuery({
    queryKey: supportQueryKeys.subscriptionPlanBreakdown(),
    queryFn: () => client.getSubscriptionPlanBreakdown(),
    refetchInterval: REFETCH_MS,
  });
}

export function useOpsHealth() {
  const { client } = useAdminApp();
  return useQuery({
    queryKey: supportQueryKeys.opsHealth(),
    queryFn: () => client.getOpsHealth(),
    refetchInterval: OPS_REFETCH_MS,
  });
}

export function useOpsAvailability(days = 7) {
  const { client } = useAdminApp();
  return useQuery({
    queryKey: supportQueryKeys.opsAvailability(days),
    queryFn: () => client.getOpsAvailability(days),
    refetchInterval: OPS_REFETCH_MS,
  });
}

export function useInvalidateSupportQueries() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: supportQueryKeys.all });
}

export function supportQueryErrorMessage(error: unknown): string {
  if (error instanceof SupportApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Request failed";
}
