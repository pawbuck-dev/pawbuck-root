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
- Also run `PawBuck.Shared.Tests` when you change shared code (`pnpm run backend:test` runs API + Shared tests). Support dashboard routes live in **PawBuck.API** (`/api/support/*`), covered indirectly by API tests as you add them.

## Milo journal chat (critical path)

### Automated (CI)

- **`MiloReasoningServiceJournalTests`** in [`backend/PawBuck.API.Tests/Services/MiloReasoningServiceJournalTests.cs`](../backend/PawBuck.API.Tests/Services/MiloReasoningServiceJournalTests.cs) — journal mode with mocked Gemini HTTP (`CreateClient("Gemini")`) and mocked domain services (happy path, bad inner JSON, empty `answer`, missing API key, 429 retry then success, persistent 429 “napping” copy, non-success Gemini HTTP). Journal `generateContent` uses JSON mode with `maxOutputTokens` floored at **512** in code so structured replies are not truncated when admin lowers the journal cap.
- **`SupportMiloJournalControllerTests`** in [`backend/PawBuck.API.Tests/Controllers/SupportMiloJournalControllerTests.cs`](../backend/PawBuck.API.Tests/Controllers/SupportMiloJournalControllerTests.cs) — `POST /api/support/milo/journal/chat-smoke` (pet ownership validation and `ChatAsync` wiring).
- **`ContextEngineTests`** — heuristic tags / guidance used by journal prompts.

### Admin portal (recommended for non-technical testers)

In the **admin dashboard** (Milo tab), use **Live journal test**: search by account email, pick the user and pet, enter a message, and send. That calls `POST /api/support/milo/journal/chat-smoke` on PawBuck.API (AdminSupport only) — same [`IMiloReasoningService.ChatAsync`](../backend/PawBuck.API/Services/MiloReasoningService.cs) pipeline as the consumer app, without subscription gating. Implementation: [`MiloJournalChatSmoke.tsx`](../admin-dashboard/src/components/MiloJournalChatSmoke.tsx), [`SupportMiloJournalController`](../backend/PawBuck.API/Controllers/SupportMiloJournalController.cs) `chat-smoke` action.

### Manual API (curl / automation)

Use the same request shape as [`MiloChatRequest`](../backend/PawBuck.API/Models/MiloChatModels.cs) and the consumer [`fetchMiloChat`](../apps/consumer-app/utils/miloChatApi.ts) payload (`message`, `pet`, `history`, `journalMode`) when hitting **`POST /api/milo/chat`** with a user JWT.

1. Sign in as a user who owns a pet; copy the Supabase **access token** (same as the app session).
2. Prefer **staging** API base URL when available; otherwise production: `EXPO_PUBLIC_PAWBUCK_API_URL` (e.g. `https://api.pawbuck.com`).
3. **Script:** from repo root, set `PAWBUCK_ACCESS_TOKEN`, `PET_ID` (uuid), optional `PAWBUCK_API_URL`, then run [`scripts/milo-journal-chat-smoke.sh`](../scripts/milo-journal-chat-smoke.sh).
4. **curl (equivalent):**

```bash
curl -sS -X POST "${PAWBUCK_API_URL}/api/milo/chat" \
  -H "Authorization: Bearer ${PAWBUCK_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"message":"How was your day?","journalMode":true,"pet":{"id":"'"${PET_ID}"'","name":"Rex","animal_type":"dog","breed":"","date_of_birth":"2020-01-01","sex":"unknown","weight_value":10,"weight_unit":"kg"},"history":[]}'
```

Expect **401** if the token is invalid, **402** if premium is required for `milo_chat`, **200** with `answer`, `suggestedReplies`, `journalSessionComplete`, and (in journal mode) `responseId` / `promptVersion` when the stack is healthy.

The same Milo chat behavior can be exercised from the admin **chat-smoke** flow (see above) without a user JWT.

### Ops checklist (production issues)

- **Logs (PawBuck.API):** search for `Gemini generateContent returned`, `Failed to deserialize Milo journal JSON`, `Failed to register journal turn` in `MiloReasoningService` — these explain generic “Sorry, I'm having trouble…” responses when `RunJournalInterviewAsync` returns null.
- **Config:** confirm `Gemini:ApiKey` (or env) is set on the deployed API; confirm journal-related **Postgres migrations** are applied.
- **Trends:** `GET /api/support/milo/journal/feedback-aggregates` (admin/support auth) for usage and thumbs feedback, not for a single chat turn diagnosis.

## What to add next (suggested)

1. **Consumer:** component tests for booking wizard and walker-facing screens; E2E (Maestro / Detox) for critical paths (optional: journal chat E2E once API + manual smoke are stable).
2. **API:** adapter tests for Vetstoria/EazyVet with HTTP mocks; idempotency tests when the store is wired.
3. **Provider app:** navigation + role-guard tests.
4. **Supabase:** `supabase db test` or SQL policy tests if you adopt them.
