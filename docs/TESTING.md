# PawBuck monorepo — testing

Use this as the baseline for the redesign (consumer), **appointment booking** (API + consumer), and **pet walker / provider** flows. Expand each suite as features ship.

## Run everything

From the repo root (pnpm):

```bash
pnpm run test:all
```

## By project

| Area | Command | Stack |
|------|---------|--------|
| **Milo** (schemas / extraction) | `pnpm --filter @pawbuck/milo test` | Jest + ts-jest |
| **API client** (shared booking HTTP) | `pnpm --filter @pawbuck/api-client test` | Jest + ts-jest (node) |
| **Consumer app** | `pnpm --filter pawbuck test` | Jest + jest-expo |
| **Provider app** | `pnpm --filter pawbuck-provider-app test` | Jest + ts-jest (node); add `jest-expo` for RN UI tests later |
| **Admin dashboard** | `pnpm --filter pawbuck-admin-dashboard test` | Jest + jsdom + ts-jest |
| **.NET API** | `pnpm run backend:test` | xUnit + FluentAssertions + Moq |

## Consumer app

- **Pure logic** lives in `services/walkMetrics.ts` (Pawthon streak + rank copy) and `constants/pawthonUi.ts` — covered by unit tests under `__tests__/`.
- **Booking** — `services/bookingsApi.ts` wraps `@pawbuck/api-client`; tests in `__tests__/services/bookingsApi.test.ts` and `__tests__/utils/pawbuckApi.test.ts`.
- **Account deletion** — `services/accountDeletion.ts` (edge function `delete-account`); tests in `__tests__/services/accountDeletion.test.ts`.
- **Integration** (Supabase, screens): add `@testing-library/react-native` specs and mock `@/utils/supabase` (the real module throws if env vars are missing).
- Run: `cd apps/consumer-app && pnpm test`

## Backend (booking & scheduling)

- `BookingsController` depends on `ISchedulingBookingService` so scheduling can be mocked in tests.
- `CompositeClinicSchedulingConfigProviderTests` covers Supabase vs appsettings fallback for clinic routing.
- `PawBuck.API.Tests` — run `dotnet test backend/PawBuck.API.Tests/PawBuck.API.Tests.csproj`.
- Also run `PawBuck.Shared.Tests` and `PawBuck.Admin.API.Tests` if you change those projects (`pnpm run backend:test` runs all three).

## What to add next (suggested)

1. **Consumer:** component tests for booking wizard and walker-facing screens; E2E (Maestro / Detox) for critical paths.
2. **API:** adapter tests for Vetstoria/EazyVet with HTTP mocks; idempotency tests when the store is wired.
3. **Provider app:** navigation + role-guard tests.
4. **Supabase:** `supabase db test` or SQL policy tests if you adopt them.
