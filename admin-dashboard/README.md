# PawBuck Admin Dashboard

Canonical **support / ops console** for PawBuck. Calls **only** `PawBuck.API` `/api/support/*` with a Supabase admin JWT.

**Do not use** `apps/pawbuck-admin` — that Next.js scaffold was removed to avoid confusion.

## Run locally

```bash
pnpm --filter pawbuck-admin-dashboard dev
```

Open [http://localhost:5173/home](http://localhost:5173/home).

Set `VITE_ADMIN_API_BASE` to your API origin (no `/api/...` path). Default dev: `http://localhost:5289`.

## Navigation (routed SPA)

| Route | Purpose |
|-------|---------|
| `/home` | Command center, global search, metrics |
| `/customers/users` | User directory |
| `/customers/users/:userId` | Account workspace |
| `/customers/pets` | Pet health explorer |
| `/email/inbox` | Review inbox (`?owner=` filter) |
| `/email/health` | Processing metrics |
| `/email/ops` | Bulk email ops |
| `/milo/*` | Milo journal, classify, ADR |
| `/product/*` | Gates, verification, document sync |

Sidebar badges use `GET /api/support/queues/summary`.

## Stack

- Vite + React 19
- React Router 7
- TanStack Query (metrics + queue summary)
- Tailwind CSS v4 (`@tailwindcss/vite`) on shell; legacy panels use `index.css`

## Tests

```bash
pnpm --filter pawbuck-admin-dashboard test
```

See [`docs/design/ADMIN_PORTAL_REDESIGN.md`](../docs/design/ADMIN_PORTAL_REDESIGN.md) and [`docs/EMAIL-PROCESSING-UAT.md`](../docs/EMAIL-PROCESSING-UAT.md).
