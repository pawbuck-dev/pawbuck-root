# revenuecat-sync-entitlement

Authenticated edge function that reads the caller's RevenueCat subscriber record (secret API key) and upserts `public.user_entitlements`. Use when webhooks are not wired yet, and after purchase/restore in the mobile app.

## Secrets (Supabase Dashboard → Edge Functions)

| Secret | Value |
|--------|--------|
| `REVENUECAT_SECRET_API_KEY` | RevenueCat project **Secret API key** (Project settings → API keys) |
| `SUPABASE_URL` | (auto) |
| `SUPABASE_SERVICE_ROLE_KEY` | (auto) |

## Client

The consumer app invokes this via `supabase.functions.invoke("revenuecat-sync-entitlement")` after purchase/restore (`services/revenuecatSync.ts`).

## Notes

- `app_user_id` in RevenueCat must match Supabase `auth.users.id` (see `syncRevenueCatUser`).
- Rows with `product_id = admin_grant` are preserved when RevenueCat shows no active entitlement.
- Founding purchases still respect `try_register_founding_purchase` cap.
