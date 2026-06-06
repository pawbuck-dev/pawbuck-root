import { meetsMinimumPlan, type SubscriptionPlan } from "@/constants/subscriptionPlans";
import type { SubscriptionStatus } from "@/services/subscriptionStatusApi";

export type DocumentQuotaState = {
  atCap: boolean;
  remaining: number | null;
  documentCount: number;
  maxDocuments: number | null;
};

export function getDocumentUploadQuota(
  plan: SubscriptionPlan,
  status: SubscriptionStatus | null | undefined
): DocumentQuotaState {
  if (meetsMinimumPlan(plan, "individual")) {
    return {
      atCap: false,
      remaining: null,
      documentCount: status?.documentCount ?? 0,
      maxDocuments: null,
    };
  }

  const max = status?.limits.maxDocuments ?? 10;
  const count = status?.documentCount ?? 0;
  const remaining = Math.max(0, max - count);
  return {
    atCap: remaining <= 0,
    remaining,
    documentCount: count,
    maxDocuments: max,
  };
}
