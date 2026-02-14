# PawBuck Monorepo

This is the monorepo for PawBuck, containing all applications, backend services, and shared resources.

## Structure

```
/pawbuck-root
├── /apps
│   ├── /consumer-app (Pet Owner App - React Native)
│   └── /provider-app (Provider App - React Native)
├── /backend
│   ├── /PawBuck.API (.NET Web API)
│   ├── /PawBuck.Admin.API (.NET Admin API)
│   └── /PawBuck.Shared (.NET Shared Library)
├── /admin-dashboard (Admin Dashboard - Web)
├── /supabase (Supabase functions and migrations)
└── /.cursor/rules (Cursor AI rules)
```

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
npm run consumer:test
npm run provider:test
npm run backend:test
npm run admin:test
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
