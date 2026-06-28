import { useEmailApproval } from "@/context/emailApprovalContext";
import { usePets } from "@/context/petsContext";
import { usePetHealthNotificationCounts } from "@/hooks/useHealthHubAttention";
import { fetchMessageThreads } from "@/services/messages";
import {
  buildInboxNotificationCounts,
  mergePetNotificationCounts,
} from "@/utils/petNotificationCounts";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * Single per-pet badge counter used on PetSelector chips app-wide:
 * unread threads + pending sender approvals + missing required vaccines + overdue vaccines.
 */
export function useUnifiedPetNotificationCounts(): Record<string, number> {
  const { pets } = usePets();
  const petIds = useMemo(() => pets.map((p) => p.id), [pets]);
  const { pendingApprovals } = useEmailApproval();

  const { data: messageThreads = [] } = useQuery({
    queryKey: ["messageThreads"],
    queryFn: () => fetchMessageThreads(),
  });

  const healthCounts = usePetHealthNotificationCounts(petIds);

  const inboxCounts = useMemo(
    () => buildInboxNotificationCounts(pendingApprovals, messageThreads),
    [pendingApprovals, messageThreads],
  );

  return useMemo(
    () => mergePetNotificationCounts(petIds, inboxCounts, healthCounts),
    [petIds, inboxCounts, healthCounts],
  );
}
