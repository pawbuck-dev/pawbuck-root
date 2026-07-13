export type EntitlementPlan = "free" | "individual" | "family";

export type EntitlementUpsertRow = {
  plan: EntitlementPlan;
  subscription_status: string | null;
  expires_at: string | null;
  is_founding_member: boolean;
  product_id: string | null;
};

const FOUNDING_PRODUCTS: Record<string, EntitlementPlan> = {
  founding_individual: "individual",
  founding_family: "family",
};

const SUBSCRIPTION_PRODUCTS: Record<string, EntitlementPlan> = {
  individual_monthly: "individual",
  individual_annual: "individual",
  family_monthly: "family",
  family_annual: "family",
};

const FAMILY_ENTITLEMENTS = new Set(["Pawbuck Family"]);
const INDIVIDUAL_ENTITLEMENTS = new Set(["Pawbuck Individual", "Pawbuck Pro"]);

export function resolvePlanFromEntitlementIds(entitlementIds: string[]): EntitlementPlan | null {
  if (entitlementIds.some((id) => FAMILY_ENTITLEMENTS.has(id))) return "family";
  if (entitlementIds.some((id) => INDIVIDUAL_ENTITLEMENTS.has(id))) return "individual";
  return null;
}

export function resolvePlanFromProductId(productId: string): EntitlementPlan | null {
  if (FOUNDING_PRODUCTS[productId]) return FOUNDING_PRODUCTS[productId];
  if (SUBSCRIPTION_PRODUCTS[productId]) return SUBSCRIPTION_PRODUCTS[productId];
  if (productId.includes("family")) return "family";
  if (productId.includes("individual") || productId.includes("pro")) return "individual";
  return null;
}

export function isFoundingProductId(productId: string): boolean {
  return productId in FOUNDING_PRODUCTS || productId.startsWith("founding_");
}

export function resolvePlanFromWebhookEvent(evt: Record<string, unknown>): EntitlementPlan | null {
  const entitlements = evt.entitlement_ids;
  if (Array.isArray(entitlements)) {
    const fromIds = resolvePlanFromEntitlementIds(
      entitlements.filter((id): id is string => typeof id === "string")
    );
    if (fromIds) return fromIds;
  }

  const productId = String(evt.product_id ?? evt.product_identifier ?? "");
  return resolvePlanFromProductId(productId);
}

type RcEntitlement = {
  expires_date?: string | null;
  product_identifier?: string | null;
};

type RcSubscriber = {
  entitlements?: Record<string, RcEntitlement>;
  non_subscriptions?: Record<string, unknown[]>;
};

function isActiveEntitlement(ent: RcEntitlement, now = Date.now()): boolean {
  if (ent.expires_date == null) return true;
  const expiresMs = Date.parse(ent.expires_date);
  return Number.isFinite(expiresMs) && expiresMs > now;
}

function pickLatestExpiry(entries: Array<{ expires_at: string | null }>): string | null {
  let latest: string | null = null;
  let latestMs = -1;
  for (const entry of entries) {
    if (!entry.expires_at) return null;
    const ms = Date.parse(entry.expires_at);
    if (Number.isFinite(ms) && ms > latestMs) {
      latestMs = ms;
      latest = entry.expires_at;
    }
  }
  return latest;
}

/** Map RevenueCat REST subscriber payload to a `user_entitlements` upsert row. */
export function entitlementRowFromRevenueCatSubscriber(
  subscriber: RcSubscriber,
  now = Date.now()
): EntitlementUpsertRow {
  const activeEntries: Array<{
    plan: EntitlementPlan;
    product_id: string | null;
    expires_at: string | null;
    is_founding: boolean;
  }> = [];

  for (const [entitlementId, ent] of Object.entries(subscriber.entitlements ?? {})) {
    if (!isActiveEntitlement(ent, now)) continue;

    const productId = ent.product_identifier ?? null;
    const plan =
      resolvePlanFromEntitlementIds([entitlementId]) ??
      (productId ? resolvePlanFromProductId(productId) : null);
    if (!plan || plan === "free") continue;

    activeEntries.push({
      plan,
      product_id: productId,
      expires_at: ent.expires_date ?? null,
      is_founding: productId ? isFoundingProductId(productId) : false,
    });
  }

  for (const [productId, purchases] of Object.entries(subscriber.non_subscriptions ?? {})) {
    if (!Array.isArray(purchases) || purchases.length === 0) continue;
    const plan = resolvePlanFromProductId(productId);
    if (!plan || plan === "free") continue;
    activeEntries.push({
      plan,
      product_id: productId,
      expires_at: null,
      is_founding: isFoundingProductId(productId),
    });
  }

  if (activeEntries.length === 0) {
    return {
      plan: "free",
      subscription_status: "SYNCED",
      expires_at: null,
      is_founding_member: false,
      product_id: null,
    };
  }

  const best =
    activeEntries.find((e) => e.plan === "family") ??
    activeEntries.find((e) => e.plan === "individual") ??
    activeEntries[0];

  const isFounding = activeEntries.some((e) => e.is_founding);

  return {
    plan: best.plan,
    subscription_status: "SYNCED",
    expires_at: isFounding ? null : pickLatestExpiry(activeEntries),
    is_founding_member: isFounding,
    product_id: best.product_id,
  };
}

export async function fetchRevenueCatSubscriber(
  appUserId: string,
  secretApiKey: string
): Promise<RcSubscriber> {
  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${secretApiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`RevenueCat subscriber fetch failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { subscriber?: RcSubscriber };
  if (!json.subscriber) {
    throw new Error("RevenueCat response missing subscriber");
  }
  return json.subscriber;
}
