# PawBuck Admin Dashboard

Support console (Vite + React) for metrics and vaccination records. It calls **PawBuck.API** (`/api/support/*`) only—never Supabase from the browser.

## Run locally

1. **Database:** Set **`backend/PawBuck.API/appsettings.Local.json`** (copy from `appsettings.Local.example.json`) with your hosted Supabase Postgres connection string. Same file also powers Milo RAG and scheduling config reads.
2. **Terminal A:** `pnpm run backend:admin` or `pnpm run backend:run` → **`http://localhost:5289`** (Swagger + `api/bookings`, `api/milo`, **`api/support/*`**).
3. **Terminal B:** `pnpm run admin:dev` — loads `admin-dashboard/.env.development` (`VITE_ADMIN_API_BASE=http://localhost:5289`). Override with `.env.local` if needed.

`X-Admin-Api-Key` is optional when the API runs in **Development** with an empty `Admin:ApiKey`.

Support routes live on the **same host** as consumer-facing booking/Milo endpoints so one deployment serves the app and the support dashboard.
