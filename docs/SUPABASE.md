# Supabase — single source of truth

**Migration safety & data-loss mitigations:** follow `.cursor/rules/database-migrations.mdc` (and include a mitigation plan in the migration or PR for destructive / high-risk changes).

## Canonical project

**Authoritative migrations and local CLI:** repository root [`supabase/`](../supabase/).

- Root [`package.json`](../package.json) scripts (`supabase:start`, `supabase:types`) run against **`supabase/`** only.
- Apply new DDL **only** under [`supabase/migrations/`](../supabase/migrations/) with a timestamp prefix (`YYYYMMDDHHMMSS_description.sql`).

## Legacy duplicate: `apps/consumer-app/supabase/`

Historically some migrations and edge functions lived under the consumer app. That tree is **deprecated for schema changes**.

| Location | Status |
|----------|--------|
| [`supabase/migrations`](../supabase/migrations/) | **Use this** for all new tables, RLS, and seeds. |
| [`apps/consumer-app/supabase/migrations`](apps/consumer-app/supabase/migrations) | Legacy; do not add new files here. Sync any still-missing migrations into root when touching related features. |
| [`apps/consumer-app/supabase/functions`](apps/consumer-app/supabase/functions) | Edge functions may remain here until moved; new functions should mirror deployment docs. |

## Apply order

1. `supabase db reset` (local) or `supabase db push` (linked project) from **`supabase/`** directory.
2. Regenerate TypeScript types for the consumer app:

   ```bash
   pnpm run supabase:types
   ```

   (Writes [`apps/consumer-app/database.types.ts`](../apps/consumer-app/database.types.ts).)

## Tables maintained for PawBuck.API

- **`public.clinic_scheduling_config`** — clinic → scheduling vendor routing read by **PawBuck.API** via Postgres connection string (`Supabase:ConnectionString`). Not exposed to mobile clients via PostgREST for anonymous/authenticated roles (RLS locked down).

## Marketplace (Rover-style) tables

See migration `*_marketplace_provider_domain.sql` for `provider_profiles`, `service_offerings`, `service_areas`, `marketplace_service_bookings`. Provider mobile app and RLS are documented in [`docs/ARCHITECTURE.md`](ARCHITECTURE.md).
