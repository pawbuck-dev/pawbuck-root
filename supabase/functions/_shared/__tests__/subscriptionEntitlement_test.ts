import {
  getOwnerActivePlan,
  isMonetizationEnabled,
  ownerMeetsFeatureGate,
  ownerMeetsMinimumPlan,
} from "../subscriptionEntitlement.ts";

type FakeClient = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: unknown) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: null }>;
      };
      maybeSingle?: () => Promise<{ data: Record<string, unknown> | null; error: null }>;
    };
  };
};

function makeClient(tables: Record<string, Record<string, unknown> | null>): FakeClient {
  return {
    from(table: string) {
      return {
        select(_cols: string) {
          return {
            eq(_col: string, _val: unknown) {
              return {
                maybeSingle: async () => ({ data: tables[table] ?? null, error: null }),
              };
            },
            maybeSingle: async () => ({ data: tables[table] ?? null, error: null }),
          };
        },
      };
    },
  };
}

Deno.test("isMonetizationEnabled defaults false when row missing", async () => {
  const client = makeClient({}) as unknown as Parameters<typeof isMonetizationEnabled>[0];
  if (await isMonetizationEnabled(client)) {
    throw new Error("expected false when flag missing");
  }
});

Deno.test("getOwnerActivePlan returns family when monetization off", async () => {
  const client = makeClient({
    app_feature_flags: { enabled: false },
    user_entitlements: { plan: "free", expires_at: null, is_founding_member: false },
  }) as unknown as Parameters<typeof getOwnerActivePlan>[0];
  const plan = await getOwnerActivePlan(client, "user-1");
  if (plan !== "family") throw new Error(`expected family, got ${plan}`);
});

Deno.test("ownerMeetsFeatureGate true when monetization off", async () => {
  const client = makeClient({
    app_feature_flags: { enabled: false },
  }) as unknown as Parameters<typeof ownerMeetsFeatureGate>[0];
  const ok = await ownerMeetsFeatureGate(client, "user-1", "family_sharing");
  if (!ok) throw new Error("expected gate to pass");
});

Deno.test("ownerMeetsMinimumPlan uses entitlements when monetization on", async () => {
  const client = makeClient({
    app_feature_flags: { enabled: true },
    user_entitlements: {
      plan: "individual",
      expires_at: null,
      is_founding_member: false,
    },
  }) as unknown as Parameters<typeof ownerMeetsMinimumPlan>[0];
  const meetsIndividual = await ownerMeetsMinimumPlan(client, "user-1", "individual");
  const meetsFamily = await ownerMeetsMinimumPlan(client, "user-1", "family");
  if (!meetsIndividual) throw new Error("expected individual to pass");
  if (meetsFamily) throw new Error("expected family to fail");
});
