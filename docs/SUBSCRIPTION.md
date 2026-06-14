# Subscription tiers and enforcement

Canonical pricing: [`PRICING.md`](PRICING.md).

## Plans

| Plan | Rank | Enforcement source |
|------|------|-------------------|
| `free` | 0 | Default for new users |
| `individual` | 1 | RevenueCat `Pawbuck Individual` or legacy `premium` |
| `family` | 2 | RevenueCat `Pawbuck Family` |

## Feature matrix (enforcement owner)

| Feature | Min plan | Client | Server |
|---------|----------|--------|--------|
| Health records (view/upload manual log) | free | — | RLS |
| Pet journal + streak | free | Ungated | — |
| Milo AI (3 lifetime on free) | free + usage | `subscriptionContext` | `MiloController` + `increment_milo_conversation_usage` |
| AI journal entries (2 lifetime on free) | free + usage | journal interview entry | `increment_ai_journal_usage` |
| Vet documents | free cap 10 | upload modals | `assert_document_quota` / triggers |
| Symptom trees, email parsing, passport PDF, alerts | individual | paywall | gates + API |
| Full vet prep brief | individual | `briefing.tsx` teaser vs full | gate `health_briefing` |
| Multi-pet | family | add-pet flow | `enforce_pet_plan_limit` trigger |
| Family sharing (5 members) | family | `family-access.tsx` | RLS + `auth_user_meets_plan_gate` |
| Book vet, pet transfer, weekly challenge, Pawthon | free | ungated | gates `minimum_plan = free` |

## Data model

- `public.user_entitlements` — plan, expiry, founding flag, product_id
- `public.user_subscription_usage` — lifetime Milo + AI journal counters
- `public.subscription_limits` — numeric caps per plan
- `public.subscription_feature_gates` — `minimum_plan` per feature key
- Webhook: `supabase/functions/revenuecat-webhook`

## Admin complimentary access

Support admins can grant **Individual** or **Family** without App Store billing:

- **API:** `PUT /api/support/subscription/users/{userId}/entitlement` (AdminSupport JWT)
- **UI:** Admin → Customers → Users → Account workspace → **Grant complimentary access**
- **Storage:** `user_entitlements.product_id = admin_grant`, `subscription_status = ADMIN_GRANT`
- **Revoke:** same endpoint with `plan: free`
- **RevenueCat:** expiration webhooks skip rows with `admin_grant`; store purchases still overwrite on renewal events

## API

- `GET /api/subscription/feature-gates` — gate list with `minimumPlan`
- `GET /api/subscription/status` — plan, usage, limits, founding spots remaining
- `POST /api/milo/chat` — 402 when free Milo cap exceeded

## Configuration

```json
"Subscription": {
  "RequirePremiumForMilo": false,
  "EnforceMiloConversationCap": true
}
```

`EXPO_PUBLIC_SUBSCRIPTION_DEV_PREMIUM=true` — dev only; treats user as `family`.

## Analytics

See `trackSubscriptionEvent` in `apps/consumer-app/utils/subscriptionAnalytics.ts`.
