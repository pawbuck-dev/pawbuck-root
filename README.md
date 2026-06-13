# PawBuck Monorepo

This is the monorepo for PawBuck: consumer and provider mobile apps, PawBuck.API, admin dashboard, shared packages, and Supabase (Postgres + Edge functions).

**Package manager:** [pnpm](https://pnpm.io/) workspaces (`packageManager` in root `package.json`). Install dependencies from the **repo root** with `pnpm install` (do not rely on per-folder `npm install` as the primary workflow).

## Structure

```
/pawbuck-root
├── /apps
│   ├── /consumer-app (pet owner — Expo / React Native)
│   └── /provider-app (marketplace provider — Expo / React Native)
├── /packages
│   ├── /milo-core → @pawbuck/milo (schemas / extraction)
│   └── /pawbuck-api-client → @pawbuck/api-client (HTTP to PawBuck.API, e.g. booking)
├── /backend
│   ├── /PawBuck.API (.NET — booking, Milo, call-center `/api/support/*`)
│   └── /PawBuck.Shared (.NET shared library)
├── /admin-dashboard (web — Vite / React)
├── /supabase (migrations + Edge functions — canonical DB migrations at repo root)
└── /.cursor/rules (Cursor AI / agent conventions)
```

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System boundaries, marketplace tables, shared packages |
| [docs/SUPABASE.md](docs/SUPABASE.md) | Single source of truth for migrations (`supabase/` root) |
| [docs/COMPLIANCE-BACKLOG.md](docs/COMPLIANCE-BACKLOG.md) | Data map, deletion/export, store checklist |
| [docs/TESTING.md](docs/TESTING.md) | Commands and coverage notes |
| [docs/AWS.md](docs/AWS.md) | ECS deploy, GitHub Actions, **Gemini via Secrets Manager** |
| [docs/MILO_RAG.md](docs/MILO_RAG.md) | Milo knowledge stores, RAG (`documentation`), `/api/milo/ask` vs chat |
| [backend/PawBuck.API/Scheduling/README.md](backend/PawBuck.API/Scheduling/README.md) | Clinic scheduling hub: adapters, Vetstoria/EazyVet, **only** in PawBuck.API |

## Getting Started

### Prerequisites

- **Node.js** — For the consumer app, match [`apps/consumer-app/.nvmrc`](apps/consumer-app/.nvmrc) when possible. Other packages generally work on current Node LTS.
- **pnpm** — Version aligned with root `package.json` `packageManager` (e.g. `corepack enable` then `corepack prepare pnpm@10.30.1 --activate`).
- **.NET 8 SDK** — for `backend/PawBuck.API` and tests.
- **Supabase CLI** — local stack and migrations (`supabase start`, `supabase db …`).

### Installation

From the **repository root**:

```bash
pnpm install
```

That installs workspace dependencies for `apps/*`, `packages/*`, and `admin-dashboard`.

### Running applications

#### Consumer app

From the repo root, root scripts run the **`pawbuck`** workspace package via `pnpm --filter pawbuck …` (same pattern as `consumer:test`):

```bash
pnpm run consumer:start
pnpm run consumer:android
pnpm run consumer:ios
```

Or from `apps/consumer-app`:

```bash
pnpm start
pnpm run ios
pnpm run android
```

**Pawthon (walk tracking)** uses `expo-location` with foreground permissions. Apply migrations (e.g. walk sessions) to your Supabase project (`supabase db push` or equivalent). After changing native plugins in `apps/consumer-app/app.json`, regenerate native projects: from root `pnpm run consumer:prebuild:clean` then `pnpm run consumer:ios`, or from the app folder `pnpm run prebuild:clean` then `pnpm run ios`.

#### Admin dashboard

```bash
pnpm run admin:dev
```

#### Backend API

```bash
pnpm run backend:build
pnpm run backend:run
```

#### Supabase (local)

```bash
pnpm run supabase:start
pnpm run supabase:stop
```

### Testing

Run **all** test suites (Milo package, API client, apps, admin, .NET):

```bash
pnpm run test:all
```

Scoped examples:

```bash
pnpm run milo:test
pnpm run consumer:test
pnpm run provider:test
pnpm run api-client:test
pnpm run admin:test
pnpm run backend:test
```

More detail: [`docs/TESTING.md`](docs/TESTING.md).

## Deploy to AWS (production)

Production deploys run the [**Deploy AWS** GitHub Actions workflow](.github/workflows/deploy-aws.yml) (Docker → ECR → ECS for the API; S3 + CloudFront for the admin dashboard). You do **not** need to open github.com — run from the repo root in your terminal.

**Prerequisites:** [GitHub CLI](https://cli.github.com/) installed and logged in (`gh auth login`). The workflow uses GitHub secrets and OIDC — your local AWS CLI login is optional for deploy (see [docs/AWS.md](docs/AWS.md)).

### Easiest: root scripts

From the **repository root**:

```bash
pnpm run deploy:api      # PawBuck.API only (most common)
pnpm run deploy:admin    # admin-dashboard static site
pnpm run deploy:both     # API + admin
pnpm run deploy:status   # list recent Deploy AWS runs
pnpm run deploy:watch    # follow the latest run in the terminal
```

Typical flow after merging to `main`:

```bash
pnpm run deploy:api && pnpm run deploy:watch
```

### Same commands via `gh` (if you prefer)

```bash
gh workflow run deploy-aws.yml -f deploy_target=api
gh workflow run deploy-aws.yml -f deploy_target=admin
gh workflow run deploy-aws.yml -f deploy_target=both
gh run list --workflow deploy-aws.yml --limit 5
gh run watch
```

After deploy, verify the API: `curl https://api.pawbuck.com/api/health` (or your public API URL).

Full setup (OIDC role, GitHub Variables, ECS sizing, troubleshooting): [**docs/AWS.md**](docs/AWS.md).

## Workspace scripts (root `package.json`)

| Script | Purpose |
|--------|---------|
| `consumer:start` / `consumer:android` / `consumer:ios` | Consumer Expo dev / native run (`pnpm --filter pawbuck …`) |
| `consumer:build` | Consumer production build |
| `consumer:prebuild` / `consumer:prebuild:clean` | Expo prebuild (native projects) |
| `consumer:test` / `consumer:typecheck` | Consumer Jest / TypeScript |
| `ci:consumer-app` | Frozen install + typecheck + `test:ci` (consumer) |
| `provider:test` | Provider app tests |
| `milo:test` | `@pawbuck/milo` unit tests |
| `api-client:test` | `@pawbuck/api-client` tests |
| `admin:dev` / `admin:build` / `admin:test` | Admin dashboard |
| `backend:build` / `backend:run` / `backend:test` | PawBuck.API + shared .NET tests |
| `test:all` | All of the above test entrypoints in sequence |
| `supabase:start` / `supabase:stop` | Local Supabase stack |
| `supabase:types` | Regenerate `apps/consumer-app/database.types.ts` from local DB |
| `deploy:api` / `deploy:admin` / `deploy:both` | Trigger **Deploy AWS** workflow (production) |
| `deploy:status` / `deploy:watch` | List or watch recent deploy runs |

## Development

Packages under `apps/*`, `packages/*`, and `admin-dashboard` declare their own scripts and dependencies; the root aggregates common CI and dev commands. For boundaries (scheduling vs marketplace, where migrations live), start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). For **clinic scheduling implementation** (vendor adapters, idempotency), see [backend/PawBuck.API/Scheduling/README.md](backend/PawBuck.API/Scheduling/README.md). For **Milo RAG and knowledge stores**, see [docs/MILO_RAG.md](docs/MILO_RAG.md).

## Contributing

Please follow the conventions and patterns established in each project's respective persona files in `.cursor/rules/`.
