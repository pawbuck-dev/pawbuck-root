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
| [`apps/consumer-app/supabase/migrations`](apps/consumer-app/supabase/migrations) | Legacy; do not add new files here. **Synced to root (20260528\*):** message-thread soft delete + audit, FAQ pgvector + `faq_source`, service grants. |
| [`apps/consumer-app/supabase/functions`](apps/consumer-app/supabase/functions) | Legacy; **canonical functions live under repo root** [`supabase/functions/`](../supabase/functions/). `purge-deleted-threads` and `add-faq` were copied to root; root [`supabase/config.toml`](../supabase/config.toml) registers all deployed functions. |

## Apply order

1. `supabase db reset` (local) or `supabase db push` (linked project) from **`supabase/`** directory.
2. Regenerate TypeScript types for the consumer app:

   ```bash
   pnpm run supabase:types
   ```

   (Writes [`apps/consumer-app/database.types.ts`](../apps/consumer-app/database.types.ts).)

## Password recovery redirect URLs

For consumer app **Forgot password** (`supabase.auth.resetPasswordForEmail`), add these to **Authentication → URL configuration → Redirect URLs** on each Supabase project:

- `pawbuck:///reset-password` (Expo deep link from `Linking.createURL('reset-password')`)
- `Pawbuck://reset-password` (scheme casing as registered in the app)
- `https://pawbuck.app/reset-password` (optional, if universal links are enabled)

Ensure **Authentication → Email** delivery is configured (SMTP or Supabase email). Local dev: read reset links from Inbucket at `http://127.0.0.1:54324` after `supabase start`.

## Scheduled Edge: care reminders (5.4)

Edge function [`supabase/functions/scheduled-care-reminders`](../supabase/functions/scheduled-care-reminders/index.ts) sends **document expiry** (insurance + travel `pet_documents`) and **vet appointment** (`vet_bookings`) push reminders. It expects:

- Environment secret **`SCHEDULED_CARE_REMINDERS_SECRET`** on the function.
- HTTP **`POST`** with header **`x-scheduled-care-reminders-secret: <same secret>`**.

Configure a **scheduled invoke** in the Supabase dashboard (or external cron) every 15–60 minutes so T-24h / T-1h vet windows are not missed. Local: `supabase functions serve scheduled-care-reminders` and call with `curl -H "x-scheduled-care-reminders-secret: ..." -X POST http://127.0.0.1:54321/functions/v1/scheduled-care-reminders`.

## Tables maintained for PawBuck.API

- **`public.clinic_scheduling_config`** — clinic → scheduling vendor routing read by **PawBuck.API** via Postgres connection string (`Supabase:ConnectionString`). Not exposed to mobile clients via PostgREST for anonymous/authenticated roles (RLS locked down).

## Marketplace (Rover-style) tables

See migration `*_marketplace_provider_domain.sql` for `provider_profiles`, `service_offerings`, `service_areas`, `marketplace_service_bookings`. Provider mobile app and RLS are documented in [`docs/ARCHITECTURE.md`](ARCHITECTURE.md).
