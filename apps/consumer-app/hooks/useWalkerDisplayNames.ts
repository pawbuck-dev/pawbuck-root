import { fetchDisplayNamesForUsers } from "@/hooks/usePetHealthWrite";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

/** Map walk_session.user_id → display name for shared-pet walk logs. */
export function useWalkerDisplayNames(userIds: string[]) {
  const key = useMemo(
    () => [...new Set(userIds.filter(Boolean))].sort().join(","),
    [userIds]
  );

  return useQuery({
    queryKey: ["display_names", "walkers", key],
    queryFn: () => fetchDisplayNamesForUsers(key ? key.split(",") : []),
    enabled: key.length > 0,
    staleTime: 300_000,
  });
}
