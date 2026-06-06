import type { SubscriptionPlan } from "@/constants/subscriptionPlans";
import { getPawbuckApiBaseUrl } from "@/utils/pawbuckApi";
import { supabase } from "@/utils/supabase";

export type SubscriptionUsage = {
  miloConversationsUsed: number;
  aiJournalEntriesUsed: number;
};

export type SubscriptionLimits = {
  maxPets: number | null;
  maxDocuments: number | null;
  maxFamilyMembers: number;
  maxMiloConversations: number | null;
  maxAiJournalEntries: number | null;
};

export type SubscriptionStatus = {
  plan: SubscriptionPlan;
  isFoundingMember: boolean;
  productId: string | null;
  expiresAt: string | null;
  usage: SubscriptionUsage;
  limits: SubscriptionLimits;
  foundingSpotsRemaining: number | null;
  documentCount: number;
};

type StatusResponse = {
  plan: string;
  isFoundingMember: boolean;
  productId?: string | null;
  expiresAt?: string | null;
  usage: { miloConversationsUsed: number; aiJournalEntriesUsed: number };
  limits: {
    maxPets?: number | null;
    maxDocuments?: number | null;
    maxFamilyMembers: number;
    maxMiloConversations?: number | null;
    maxAiJournalEntries?: number | null;
  };
  foundingSpotsRemaining?: number | null;
  documentCount: number;
};

function parsePlan(raw: string): SubscriptionPlan {
  if (raw === "family" || raw === "individual") return raw;
  if (raw === "premium") return "individual";
  return "free";
}

export async function fetchSubscriptionStatus(): Promise<SubscriptionStatus | null> {
  const base = getPawbuckApiBaseUrl();
  if (!base) return null;

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return null;

  const res = await fetch(`${base}/api/subscription/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `subscription status HTTP ${res.status}`);
  }

  const json = (await res.json()) as StatusResponse;
  return {
    plan: parsePlan(json.plan),
    isFoundingMember: json.isFoundingMember,
    productId: json.productId ?? null,
    expiresAt: json.expiresAt ?? null,
    usage: {
      miloConversationsUsed: json.usage?.miloConversationsUsed ?? 0,
      aiJournalEntriesUsed: json.usage?.aiJournalEntriesUsed ?? 0,
    },
    limits: {
      maxPets: json.limits?.maxPets ?? null,
      maxDocuments: json.limits?.maxDocuments ?? null,
      maxFamilyMembers: json.limits?.maxFamilyMembers ?? 0,
      maxMiloConversations: json.limits?.maxMiloConversations ?? null,
      maxAiJournalEntries: json.limits?.maxAiJournalEntries ?? null,
    },
    foundingSpotsRemaining: json.foundingSpotsRemaining ?? null,
    documentCount: json.documentCount ?? 0,
  };
}
