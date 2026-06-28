/**
 * Unified per-pet badge counts for PetSelector across Home, Messages, and Health Records.
 * Combines inbox attention (pending senders + unread threads) with health attention
 * (missing required vaccines + overdue vaccines).
 */

export type InboxNotificationInput = {
  pet_id?: string | null;
  unread_count?: number | null;
};

export type PendingApprovalNotificationInput = {
  pet_id?: string | null;
};

/** Inbox slice: pending email approvals + unread message threads per pet. */
export function buildInboxNotificationCounts(
  pendingApprovals: PendingApprovalNotificationInput[],
  messageThreads: InboxNotificationInput[],
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const approval of pendingApprovals) {
    if (!approval.pet_id) continue;
    counts[approval.pet_id] = (counts[approval.pet_id] ?? 0) + 1;
  }

  for (const thread of messageThreads) {
    if (!thread.pet_id) continue;
    const unread = thread.unread_count ?? 0;
    if (unread <= 0) continue;
    counts[thread.pet_id] = (counts[thread.pet_id] ?? 0) + unread;
  }

  return counts;
}

/** Sum inbox + health counts for each pet id. */
export function mergePetNotificationCounts(
  petIds: string[],
  inboxCounts: Record<string, number>,
  healthCounts: Record<string, number>,
): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const petId of petIds) {
    const total = (inboxCounts[petId] ?? 0) + (healthCounts[petId] ?? 0);
    if (total > 0) {
      merged[petId] = total;
    }
  }
  return merged;
}
