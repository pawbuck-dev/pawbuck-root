# PawBuck Admin Dashboard

Support console (Vite + React) for metrics and vaccination records. It calls **PawBuck.API** (`/api/support/*`) only—never Supabase PostgREST for privileged data.

**AI / contributor conventions:** `.cursor/rules/admin-support-portal.mdc` (consumer parity, detail diagnostics, tests). Email UAT: `docs/EMAIL-PROCESSING-UAT.md`.

## Auth

Support routes require a **Supabase access token** with `app_metadata.role` matching the API’s `Admin:RequiredAppMetadataRole` (default **`admin`**). The SPA uses `@supabase/supabase-js` for sign-in and sends `Authorization: Bearer <token>`.

When **PawBuck.API** runs in **Development** with `Admin:AllowAnonymousSupportInDevelopment` enabled (see `appsettings.Development.json`), support routes accept requests **without** a Bearer token so you can iterate without configuring Supabase in the admin app.

For production builds, set **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** (same project as the consumer app). Add them to `.env.local` (gitignored) or your CI variables.

## Run locally

1. **Database:** Set **`backend/PawBuck.API/appsettings.Local.json`** (copy from `appsettings.Local.example.json`) with your hosted Supabase Postgres connection string. Same file also powers Milo RAG and scheduling config reads.
2. **Terminal A:** `pnpm run backend:admin` or `pnpm run backend:run` → **`http://localhost:5289`** (Swagger + `api/bookings`, `api/milo`, **`api/support/*`**).
3. **Terminal B:** `pnpm run admin:dev` — loads `admin-dashboard/.env.development` (`VITE_ADMIN_API_BASE=http://localhost:5289`). Optionally add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` for sign-in. Override as needed.

Support routes live on the **same host** as consumer-facing booking/Milo endpoints so one deployment serves the app and the support dashboard.
