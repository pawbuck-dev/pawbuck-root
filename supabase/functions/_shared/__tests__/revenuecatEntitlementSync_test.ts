import {
  entitlementRowFromRevenueCatSubscriber,
  resolvePlanFromProductId,
  resolvePlanFromWebhookEvent,
} from "../revenuecatEntitlementSync.ts";

Deno.test("resolvePlanFromWebhookEvent maps entitlement ids", () => {
  const plan = resolvePlanFromWebhookEvent({
    type: "INITIAL_PURCHASE",
    entitlement_ids: ["Pawbuck Individual"],
    product_id: "individual_monthly",
  });
  if (plan !== "individual") throw new Error(`expected individual, got ${plan}`);
});

Deno.test("resolvePlanFromProductId maps subscription skus", () => {
  if (resolvePlanFromProductId("family_annual") !== "family") {
    throw new Error("family_annual");
  }
  if (resolvePlanFromProductId("founding_individual") !== "individual") {
    throw new Error("founding_individual");
  }
});

Deno.test("entitlementRowFromRevenueCatSubscriber picks family over individual", () => {
  const row = entitlementRowFromRevenueCatSubscriber({
    entitlements: {
      "Pawbuck Individual": {
        expires_date: "2099-01-01T00:00:00Z",
        product_identifier: "individual_monthly",
      },
      "Pawbuck Family": {
        expires_date: "2099-06-01T00:00:00Z",
        product_identifier: "family_monthly",
      },
    },
  });
  if (row.plan !== "family") throw new Error(`expected family, got ${row.plan}`);
  if (row.product_id !== "family_monthly") throw new Error("wrong product");
});

Deno.test("entitlementRowFromRevenueCatSubscriber returns free when expired", () => {
  const row = entitlementRowFromRevenueCatSubscriber({
    entitlements: {
      "Pawbuck Individual": {
        expires_date: "2020-01-01T00:00:00Z",
        product_identifier: "individual_monthly",
      },
    },
  });
  if (row.plan !== "free") throw new Error(`expected free, got ${row.plan}`);
});

Deno.test("entitlementRowFromRevenueCatSubscriber handles founding non-subscriptions", () => {
  const row = entitlementRowFromRevenueCatSubscriber({
    entitlements: {},
    non_subscriptions: {
      founding_individual: [{ id: "x" }],
    },
  });
  if (row.plan !== "individual") throw new Error(`expected individual, got ${row.plan}`);
  if (!row.is_founding_member) throw new Error("expected founding");
  if (row.expires_at !== null) throw new Error("founding should not expire");
});
