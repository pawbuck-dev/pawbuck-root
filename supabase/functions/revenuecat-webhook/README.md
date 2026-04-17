# revenuecat-webhook

Upserts `public.user_entitlements` when RevenueCat sends subscription lifecycle events.

## Secrets (Supabase Dashboard → Edge Functions)

- `REVENUECAT_WEBHOOK_SECRET` — shared secret; send as `Authorization: Bearer <secret>` from RevenueCat (or your proxy).
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — provided by Supabase for functions.

## App user ID

Configure the mobile app to use the Supabase `auth.users.id` as RevenueCat’s `app_user_id` after sign-in so webhook rows match RLS and API checks.

## Local testing

```bash
curl -X POST "$SUPABASE/functions/v1/revenuecat-webhook" \
  -H "Authorization: Bearer $REVENUECAT_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"event":{"type":"INITIAL_PURCHASE","app_user_id":"<uuid>","expiration_at_ms":1893456000000}}'
```
