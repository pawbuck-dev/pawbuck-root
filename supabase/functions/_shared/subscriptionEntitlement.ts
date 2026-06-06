/**
 * Server-side plan checks for Edge functions (service role).
 */
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type SubscriptionPlan = "free" | "individual" | "family" | "premium";

const PLAN_RANK: Record<string, number> = {
  free: 0,
  premium: 1,
  individual: 1,
  family: 2,
};

function normalizePlan(raw: string | null | undefined): SubscriptionPlan {
  if (raw === "family") return "family";
  if (raw === "individual" || raw === "premium") return "individual";
  return "free";
}

function isActiveRow(row: {
  plan: string;
  expires_at: string | null;
  is_founding_member?: boolean | null;
}): boolean {
  if (row.is_founding_member) return true;
  const plan = normalizePlan(row.plan);
  if (plan === "free") return false;
  if (!row.expires_at) return true;
  return new Date(row.expires_at).getTime() > Date.now();
}

export async function getOwnerActivePlan(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionPlan> {
  const { data, error } = await supabase
    .from("user_entitlements")
    .select("plan, expires_at, is_founding_member")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data || !isActiveRow(data)) return "free";
  return normalizePlan(data.plan);
}

export async function ownerMeetsMinimumPlan(
  supabase: SupabaseClient,
  userId: string,
  minimumPlan: "individual" | "family",
): Promise<boolean> {
  const active = await getOwnerActivePlan(supabase, userId);
  return PLAN_RANK[active] >= PLAN_RANK[minimumPlan];
}

export async function getFoundingMemberStats(
  supabase: SupabaseClient,
): Promise<{ purchaseCount: number; spotsRemaining: number }> {
  const { data } = await supabase
    .from("founding_member_counter")
    .select("purchase_count")
    .eq("id", 1)
    .maybeSingle();
  const purchaseCount = data?.purchase_count ?? 0;
  return {
    purchaseCount,
    spotsRemaining: Math.max(0, 500 - purchaseCount),
  };
}
