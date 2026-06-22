# RevenueCat setup (PawBuck v1.5)

Connect App Store / Google Play billing to PawBuck via RevenueCat. Canonical prices and feature matrix: [`PRICING.md`](PRICING.md). Enforcement: [`SUBSCRIPTION.md`](SUBSCRIPTION.md).

## Architecture

```text
App Store / Play Console  →  RevenueCat  →  Mobile SDK (react-native-purchases)
                              ↓ webhook
                    supabase/functions/revenuecat-webhook
                              ↓
                    public.user_entitlements  ←  PawBuck.API + RLS
```

- **Mobile** reads entitlements from RevenueCat (`getCustomerInfo`) and Supabase (`user_entitlements`).
- **Webhook** is source of truth for server-side gates (Milo caps, document quota, multi-pet).
- **`app_user_id`** must be the Supabase `auth.users.id` (already wired in `syncRevenueCatUser`).

---

## Recommended path: Test Store → Sandbox → Production

| Stage | API key prefix | Store | When |
|-------|----------------|-------|------|
| **1. Test Store** | `test_` | RevenueCat-hosted (no App Store / Play yet) | Now — validate paywall, purchase flow, entitlements in app |
| **2. Platform sandbox** | `appl_` / `goog_` | Apple Sandbox / Play test track | Before App Review — real StoreKit / Play billing |
| **3. Production** | `appl_` / `goog_` | Live stores | After review + webhook verified |

---

## 0. Test Store (start here — no App Store products required)

RevenueCat provisions a **Test Store** with every project. Purchases use a RevenueCat test modal (not Apple/Google), but return the same `CustomerInfo` / entitlement shape as production.

### Dashboard setup

1. RevenueCat → **Apps & providers** → open **Test Store** (or create if prompted).
2. Copy the **Test Store API key** (starts with `test_`).
3. Under Test Store, create products with the **same product ids** as [`PRICING.md`](PRICING.md):
   - `individual_monthly`, `individual_annual`, `family_monthly`, `family_annual`
   - `founding_individual`, `founding_family` (optional)
4. Attach products to entitlements **`Pawbuck Individual`** and **`Pawbuck Family`**.
5. Add all packages to offering **`default`** and set it as **Current**.

### App env (dev only)

In `apps/consumer-app/.env.local`:

```bash
# Test Store — use on simulator / debug builds only
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=test_xxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=test_xxxxxxxx
```

Rebuild native app (`npx expo run:ios`). Metro reload does **not** pick up new env vars.

### What to verify

1. Sign in → RevenueCat dashboard shows customer with Supabase user id.
2. Profile → Compare plans → prices from Test Store offerings.
3. Subscribe → RevenueCat test purchase dialog (not Apple ID sheet).
4. Profile plan updates to Individual/Family; Milo/doc gates unlock.
5. Optional: wire webhook (section 5) so `user_entitlements` updates server-side too.

### Test Store limits

- Does **not** replace Apple Sandbox before launch (no real StoreKit, Ask to Buy, regional pricing quirks).
- Use **`test_` keys only in debug/dev builds** — never ship to App Store / Play.
- Subscriptions renew on accelerated timers in Test Store (monthly ≈ 5 min) for renewal testing.

### UI-only bypass (not RevenueCat)

`EXPO_PUBLIC_SUBSCRIPTION_DEV_PREMIUM=true` skips paywalls and treats you as Family — useful for non-billing QA, **not** for testing purchases.

---

## 1. App Store Connect (iOS)

Create a **Subscription Group** (e.g. `pawbuck_premium`) with these **Product IDs** (must match exactly):

| Product ID | Type | Price (USD) | Entitlement |
|------------|------|-------------|-------------|
| `individual_monthly` | Auto-renewable | $5.99/mo | Pawbuck Individual |
| `individual_annual` | Auto-renewable | $49.99/yr | Pawbuck Individual |
| `family_monthly` | Auto-renewable | $9.99/mo | Pawbuck Family |
| `family_annual` | Auto-renewable | $79.99/yr | Pawbuck Family |
| `founding_individual` | Non-consumable | $34.99 | Pawbuck Individual + founding |
| `founding_family` | Non-consumable | $54.99 | Pawbuck Family + founding |

Add **Sandbox testers** in App Store Connect → Users and Access → Sandbox.

Link the app bundle id: `com.pawbuck.app`.

---

## 2. Google Play Console (Android)

Create the same **product IDs** under Monetize → Products (subscriptions + one-time for founding).

Match prices to [`PRICING.md`](PRICING.md). Enable **Real-time developer notifications** (optional; RevenueCat handles Play billing events when linked).

---

## 3. RevenueCat project

1. Create project at [app.revenuecat.com](https://app.revenuecat.com).
2. Add **iOS** app (bundle id) and **Android** app (package name).
3. Link **App Store Connect API key** and **Google Play service credentials** (RevenueCat docs: *Store configuration*).

### Entitlements (Identifiers → Entitlements)

| Entitlement identifier | Grants plan |
|------------------------|-------------|
| `Pawbuck Individual` | `individual` |
| `Pawbuck Family` | `family` |
| `Pawbuck Pro` | `individual` (legacy) |

### Products

Import / attach each store product id above to the matching entitlement.

### Offerings

Create offering **`default`** (current):

| Package (custom) | Product id |
|------------------|------------|
| Individual monthly | `individual_monthly` |
| Individual annual | `individual_annual` |
| Family monthly | `family_monthly` |
| Family annual | `family_annual` |
| Founding Individual | `founding_individual` |
| Founding Family | `founding_family` |

Set **`default`** as the **Current offering**. The app calls `Purchases.getOfferings()` and maps packages by **product id** (`constants/subscriptionProducts.ts`).

### Paywall (optional)

Design a paywall in RevenueCat → Paywalls. The app uses:

1. **Direct package purchase** (`purchasePackage`) when user taps Individual/Family in Compare plans.
2. **Fallback:** `RevenueCatUI.presentPaywall()` (dashboard paywall) if packages are missing.

---

## 4. Mobile app environment

Copy `apps/consumer-app/.env.example` → `.env.local`:

```bash
# Dev: RevenueCat Test Store (test_…) — see section 0
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=test_xxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=test_xxxxxxxx

# Pre-launch / production: platform keys (appl_… / goog_…)
# EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxxxxxxx
# EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_xxxxxxxx
```

Keys: RevenueCat → Project → **API keys** → Public app-specific keys.

Rebuild native app after changing env (`npx expo run:ios` / EAS build). Metro reload alone is not enough for new env vars.

**Dev without keys:** UI shows fallback prices from [`PRICING.md`](PRICING.md). Subscribe opens App Store subscriptions or shows an error.

**Dev premium override:** `EXPO_PUBLIC_SUBSCRIPTION_DEV_PREMIUM=true` (never in production).

---

## 5. Webhook → Supabase

### Deploy secret

Supabase Dashboard → Edge Functions → `revenuecat-webhook` → Secrets:

| Secret | Value |
|--------|--------|
| `REVENUECAT_WEBHOOK_SECRET` | Random string you choose |
| `SUPABASE_URL` | (auto) |
| `SUPABASE_SERVICE_ROLE_KEY` | (auto) |

### RevenueCat webhook URL

```
https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook
```

Authorization header: `Bearer <REVENUECAT_WEBHOOK_SECRET>`

Enable events: `INITIAL_PURCHASE`, `RENEWAL`, `NON_RENEWING_PURCHASE`, `EXPIRATION`, `PRODUCT_CHANGE`, `UNCANCELLATION`.

Handler: `supabase/functions/revenuecat-webhook/index.ts` — maps product ids → `user_entitlements.plan`, founding cap via `try_register_founding_purchase`.

### Verify locally

```bash
curl -X POST "$SUPABASE_URL/functions/v1/revenuecat-webhook" \
  -H "Authorization: Bearer $REVENUECAT_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "type": "INITIAL_PURCHASE",
      "app_user_id": "<supabase-user-uuid>",
      "product_id": "individual_monthly",
      "entitlement_ids": ["Pawbuck Individual"],
      "expiration_at_ms": 1893456000000
    }
  }'
```

Check `public.user_entitlements` for that user.

---

## 6. Sandbox test checklist

- [ ] Sign in → `syncRevenueCatUser` sets RC `app_user_id` = Supabase user id (check RevenueCat customer dashboard).
- [ ] Profile shows **Free**; Compare plans shows store prices (or fallback if no keys).
- [ ] Subscribe Individual → Apple sandbox sheet → purchase → Profile shows **Individual**.
- [ ] Webhook row in `user_entitlements` with correct `product_id`.
- [ ] Add 2nd pet → Family paywall; purchase Family → unlimited pets.
- [ ] Restore purchases works after reinstall.
- [ ] Founding SKU purchase sets `is_founding_member = true` (cap 500 in DB).

---

## 7. Code map

| Concern | Location |
|---------|----------|
| Product ids | `apps/consumer-app/constants/subscriptionProducts.ts` |
| Entitlement ids | `apps/consumer-app/constants/revenuecat.ts` |
| SDK configure + login | `apps/consumer-app/services/revenuecat.ts` |
| Offerings + purchase | `apps/consumer-app/services/revenuecatOfferings.ts` |
| Live prices in UI | `hooks/useSubscriptionOfferingPrices.ts` |
| Webhook | `supabase/functions/revenuecat-webhook/` |
| Server limits | `subscription_limits`, `subscription_feature_gates` migrations |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Compare plans / Subscribe does nothing | Add RC API keys; rebuild app. |
| “Couldn’t load subscription plans” | Offering empty or products not linked in RC dashboard. |
| Purchase succeeds but plan stays Free | Webhook secret/URL wrong; check `app_user_id` matches Supabase uuid. |
| Wrong plan after purchase | Product id typo — must match webhook `SUBSCRIPTION_PRODUCTS` map. |

For support-granted access without billing, use admin **Grant complimentary access** (see [`SUBSCRIPTION.md`](SUBSCRIPTION.md)).
