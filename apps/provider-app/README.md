# PawBuck Provider App

Expo Router shell for **service providers** (walkers, groomers, etc.). Shares **`@pawbuck/api-client`** with the consumer app for PawBuck.API calls.

## Setup

- `EXPO_PUBLIC_PAWBUCK_API_URL` — same scheduling API as consumer (no trailing slash).
- Supabase: use the **same project** as consumer; access to `provider_profiles`, `service_offerings`, `service_areas`, and `marketplace_service_bookings` is enforced by **RLS** (see root `supabase/migrations/*_marketplace_provider_domain.sql`).

## Auth roles

RLS keys off `auth.uid()` owning a `provider_profiles` row. Optional later: Supabase `app_metadata.role = provider` to gate sign-up flows in this app.

## Run

```bash
pnpm --filter pawbuck-provider-app start
```

See [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) for system boundaries.
