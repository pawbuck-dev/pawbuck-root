import { getPawbuckApiBaseUrl } from "@/utils/pawbuckApi";
import { supabase } from "@/utils/supabase";

export type SubscriptionFeatureGateItem = {
  featureKey: string;
  requiresPremium: boolean;
  label: string;
  sortOrder: number;
  updatedAt: string;
};

type FeatureGatesResponse = {
  items: SubscriptionFeatureGateItem[];
};

/**
 * Fetches admin-configured paywall gates from PawBuck.API (requires Supabase JWT).
 */
export async function fetchSubscriptionFeatureGates(): Promise<Record<string, boolean>> {
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

  const json = (await res.json()) as FeatureGatesResponse;
  const map: Record<string, boolean> = {};
  for (const item of json.items ?? []) {
    map[item.featureKey] = item.requiresPremium;
  }
  return map;
}
