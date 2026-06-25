import { meetsMinimumPlan, type SubscriptionPlan } from "@/constants/subscriptionPlans";
import type { SubscriptionStatus } from "@/services/subscriptionStatusApi";

/** Remaining lifetime Milo conversations for free tier; null when unlimited. */
export function getMiloConversationsRemaining(
  plan: SubscriptionPlan,
  status: SubscriptionStatus | null | undefined
): number | null {
  if (meetsMinimumPlan(plan, "individual")) return null;
  const max = status?.limits.maxMiloConversations ?? 3;
  const used = status?.usage.miloConversationsUsed ?? 0;
  return Math.max(0, max - used);
}

/** Remaining lifetime AI journal entries for free tier; null when unlimited. */
export function getAiJournalEntriesRemaining(
  plan: SubscriptionPlan,
  status: SubscriptionStatus | null | undefined
): number | null {
  if (meetsMinimumPlan(plan, "individual")) return null;
  const max = status?.limits.maxAiJournalEntries ?? 2;
  const used = status?.usage.aiJournalEntriesUsed ?? 0;
  return Math.max(0, max - used);
}

export function canStartAiJournalEntry(
  plan: SubscriptionPlan,
  status: SubscriptionStatus | null | undefined
): boolean {
  const remaining = getAiJournalEntriesRemaining(plan, status);
  return remaining === null || remaining > 0;
}
