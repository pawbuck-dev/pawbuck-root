# Subscription tiers and enforcement

This document defines the free vs paid split and where each feature is enforced. Update this table when product changes.

## Feature matrix

| Feature | Tier | Client UI | Server enforcement |
|--------|------|-----------|---------------------|
| Health records (storage, viewing, uploads) | Free | — | — (RLS as today) |
| Milo AI chat | Premium | `SubscriptionProvider`, `BottomNavBar`, `MiloChatModal` / `chatContext` | `POST /api/milo/chat` returns **402** when `Subscription:RequirePremiumForMilo` is true and user has no active premium row in `public.user_entitlements` |
| Pet journal (timeline, briefing entry) | Premium | Home pet journal row, briefing card, `pet-journal` routes | Future: optional Edge/API if journal syncs server-side beyond health records |
| Weekly challenge card (leaderboard entry) | Premium | `WeeklyChallengeCard` on Home | Same as Pawthon hub if API added later |
| Vet booking wizard | Premium | `BookVetVisitSection` | Future: `BookingsController` + JWT when booking is wired for production |
| Pawthon walk (GPS walk) | Free | — | — (product may change) |

## Data model

- Table: `public.user_entitlements` (see migration). `plan = 'premium'` and (`expires_at` is null or in the future) means active premium.
- Updates from App Store / Google Play should flow through **RevenueCat** (or equivalent) webhooks into Supabase via `supabase/functions/revenuecat-webhook` (see function README). Do not trust client-only entitlement flags for paid APIs.

## Configuration

### PawBuck.API (`appsettings.json`)

```json
"Subscription": {
  "RequirePremiumForMilo": false
}
```

Set `RequirePremiumForMilo` to `true` in production when subscriptions are live and `user_entitlements` is populated. When `false`, Milo chat does not check the database (backward compatible for local dev).

### Consumer app

- `EXPO_PUBLIC_SUBSCRIPTION_DEV_PREMIUM=true` — treats the user as premium in development only (never ship in production builds).

## Analytics

Events (see `trackSubscriptionEvent` in `apps/consumer-app/utils/subscriptionAnalytics.ts`):

- `paywall_impression`
- `paywall_subscribe_tap`
- `paywall_dismiss`
- `premium_feature_blocked`

## Compliance

- Disclose subscription terms in App Store / Play listings and in-app before purchase.
- Implement **Restore purchases** when IAP is integrated (RevenueCat handles this).
- Account deletion: billing remains with Apple/Google; see `docs/COMPLIANCE-BACKLOG.md`.
