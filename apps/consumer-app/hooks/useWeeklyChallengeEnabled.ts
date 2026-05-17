import { fetchAppRegisteredUserCount } from "@/services/walkSessions";
import { isWeeklyChallengeEnabled } from "@/services/walkMetrics";
import { useQuery } from "@tanstack/react-query";

const STALE_MS = 1000 * 60 * 30;

/**
 * Weekly challenge UI is shown only when the app has more than {@link WEEKLY_CHALLENGE_MIN_APP_USERS} registered users.
 */
export function useWeeklyChallengeEnabled() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["app", "registeredUserCount"],
    queryFn: fetchAppRegisteredUserCount,
    staleTime: STALE_MS,
  });

  const weeklyChallengeEnabled =
    !isLoading && !isError && isWeeklyChallengeEnabled(data ?? 0);

  return { weeklyChallengeEnabled, isLoading };
}
