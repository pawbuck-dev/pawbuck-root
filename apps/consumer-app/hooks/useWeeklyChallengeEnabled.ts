import { fetchAppRegisteredUserCountForCountry } from "@/services/walkSessions";
import { isWeeklyChallengeEnabledForCountry } from "@/services/walkMetrics";
import { useQuery } from "@tanstack/react-query";

const STALE_MS = 1000 * 60 * 30;

/**
 * Weekly challenge UI is shown only when the selected pet's country has more than
 * {@link WEEKLY_CHALLENGE_MIN_COUNTRY_USERS} registered pet owners (same pets.country value).
 */
export function useWeeklyChallengeEnabled(petCountry: string | null | undefined) {
  const country = petCountry?.trim() ?? "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["app", "registeredUserCount", "country", country],
    queryFn: () => fetchAppRegisteredUserCountForCountry(country),
    enabled: country.length > 0,
    staleTime: STALE_MS,
  });

  const weeklyChallengeEnabled =
    country.length > 0 && !isLoading && !isError && isWeeklyChallengeEnabledForCountry(data ?? 0);

  return { weeklyChallengeEnabled, isLoading, countryUserCount: data ?? 0 };
}
