import type { SubscriptionPlan } from "@/constants/subscriptionPlans";
import { normalizePlan, PLAN_RANK } from "@/constants/subscriptionPlans";
import { getPawbuckApiBaseUrl } from "@/utils/pawbuckApi";
import { supabase } from "@/utils/supabase";

export type SubscriptionFeatureGateItem = {
  featureKey: string;
  requiresPremium: boolean;
  minimumPlan: SubscriptionPlan;
  label: string;
  sortOrder: number;
  updatedAt: string;
};

export type FeatureGatesMaps = {
  requiresPremium: Record<string, boolean>;
  minimumPlan: Record<string, SubscriptionPlan>;
};

type FeatureGatesResponse = {
  items: SubscriptionFeatureGateItem[];
};

/**
 * Fetches admin-configured paywall gates from PawBuck.API (requires Supabase JWT).
 */
export async function fetchSubscriptionFeatureGates(): Promise<FeatureGatesMaps> {
  const base = getPawbuckApiBaseUrl();
  if (!base) {
    throw new Error("EXPO_PUBLIC_PAWBUCK_API_URL is not set");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error("Not signed in");
  }

  const res = await fetch(`${base}/api/subscription/feature-gates`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `feature-gates HTTP ${res.status}`);
  }

  const json = (await res.json()) as { items: Array<Record<string, unknown>> };
  const requiresPremium: Record<string, boolean> = {};
  const minimumPlan: Record<string, SubscriptionPlan> = {};

  for (const raw of json.items ?? []) {
    const featureKey = String(raw.featureKey ?? raw.feature_key ?? "");
    if (!featureKey) continue;
    const minRaw = String(raw.minimumPlan ?? raw.minimum_plan ?? "free");
    const min = normalizePlan(minRaw);
    minimumPlan[featureKey] = min;
    requiresPremium[featureKey] =
      typeof raw.requiresPremium === "boolean"
        ? raw.requiresPremium
        : PLAN_RANK[min] > 0;
  }

  return { requiresPremium, minimumPlan };
}

/** @deprecated Use fetchSubscriptionFeatureGates — returns requiresPremium map only. */
export async function fetchSubscriptionFeatureGatesLegacy(): Promise<Record<string, boolean>> {
  const maps = await fetchSubscriptionFeatureGates();
  return maps.requiresPremium;
}
