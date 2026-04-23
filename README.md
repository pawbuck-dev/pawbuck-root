# PawBuck Monorepo

This is the monorepo for PawBuck, containing all applications, backend services, and shared resources.

## Structure

```
/pawbuck-root
├── /apps
│   ├── /consumer-app (Pet Owner App - React Native)
│   └── /provider-app (Provider App - React Native)
├── /backend
│   ├── /PawBuck.API (.NET — booking, Milo, call-center `/api/support/*`)
│   └── /PawBuck.Shared (.NET Shared Library)
├── /admin-dashboard (Admin Dashboard - Web)
├── /supabase (Supabase functions and migrations)
└── /.cursor/rules (Cursor AI rules)
```

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System boundaries, marketplace tables, shared packages |
| [docs/SUPABASE.md](docs/SUPABASE.md) | Single source of truth for migrations (`supabase/` root) |
| [docs/COMPLIANCE-BACKLOG.md](docs/COMPLIANCE-BACKLOG.md) | Data map, deletion/export, store checklist |
| [docs/TESTING.md](docs/TESTING.md) | Commands and coverage notes |
| [docs/AWS.md](docs/AWS.md) | ECS deploy, GitHub Actions, **Gemini via Secrets Manager** |

## Getting Started

### Prerequisites
- Node.js 18+
- .NET 8 SDK
- Supabase CLI

### Installation

1. Install root dependencies:
```bash
npm install
```

2. Install consumer app dependencies:
```bash
cd apps/consumer-app
npm install
```

3. Install provider app dependencies:
```bash
cd apps/provider-app
npm install
```

4. Install admin dashboard dependencies:
```bash
cd admin-dashboard
npm install
```

### Running Applications

#### Consumer App
```bash
npm run consumer:start
npm run consumer:android
npm run consumer:ios
```

**Pawthon (walk tracking)** uses `expo-location` with foreground permissions. Apply the migration `supabase/migrations/20260222120000_walk_sessions.sql` to your project (`supabase db push` or equivalent). After changing native plugins in `apps/consumer-app/app.json`, regenerate native projects from the **repo root**: `npm run consumer:prebuild:clean` then `npm run consumer:ios` (or run `pnpm prebuild:clean` and `pnpm ios` from `apps/consumer-app`).

#### Backend APIs
```bash
npm run backend:build
npm run backend:run
```

#### Supabase
```bash
npm run supabase:start
npm run supabase:stop
```

### Testing

Run all tests:
```bash
npm run test:all
```

Run tests for specific projects:
```bash
pnpm run consumer:test
pnpm run provider:test
pnpm run api-client:test
pnpm run backend:test
pnpm run admin:test
```

## Workspace Scripts

- `consumer:start` - Start consumer app dev server
- `consumer:android` - Run consumer app on Android
- `consumer:ios` - Run consumer app on iOS
- `consumer:build` - Build consumer app
- `consumer:test` - Run consumer app tests
- `provider:test` - Run provider app tests
- `backend:build` - Build .NET backend
- `backend:run` - Run .NET backend
- `backend:test` - Run all .NET backend tests
- `admin:test` - Run admin dashboard tests
- `test:all` - Run all test suites
- `supabase:start` - Start local Supabase
- `supabase:stop` - Stop local Supabase
- `supabase:types` - Generate TypeScript types from Supabase

## Development

Each project maintains its own dependencies and configuration. The root workspace provides convenience scripts for common operations.

## Contributing

Please follow the conventions and patterns established in each project's respective persona files in `.cursor/rules/`.
