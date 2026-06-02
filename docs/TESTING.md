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

- **Email & Review Inbox** — `utils/mailResolveApi.ts`, `services/pendingEmailApprovals.ts`, `services/failedEmails.ts`, `services/petEmailList.ts`; RTL: `__tests__/components/messages/ReviewInboxResolutionModal.test.tsx`, `__tests__/components/email-approval/EmailApprovalModal.test.tsx`.
- **Health records** — CRUD services (`vaccinations`, `medicines`, `clinicalExams`, `labResults`), `services/healthBriefing.ts`, `utils/reviewMedication.ts`; RTL: `__tests__/components/health/HealthRecordsUploadSheet.test.tsx`.
- **Shared test helpers** — `__tests__/helpers/supabaseMock.ts` (`createSupabaseMock`, `mockSelectChain`).
- **Coverage (report-only in CI)** — `pnpm --filter pawbuck test:coverage` scopes `collectCoverageFrom` to email + health paths in `jest.config.js` (no fail thresholds yet).
- **Pure logic** — also `services/walkMetrics.ts`, `constants/pawthonUi.ts`.
- **Booking** — `services/bookingsApi.ts`; tests in `__tests__/services/bookingsApi.test.ts` and `__tests__/utils/pawbuckApi.test.ts`.
- **Account deletion** — `services/accountDeletion.ts`; tests in `__tests__/services/accountDeletion.test.ts`.
- **Family sharing & pet transfer (journeys)** — `services/householdInvites.ts`, `services/petFamilyInvites.ts`, `services/petTransfers.ts`; navigation tests in `__tests__/navigation/familyTransferEntryPoints.test.ts`; see [TESTING_FAMILY_SHARING.md](./TESTING_FAMILY_SHARING.md) and [TESTING_PET_TRANSFER.md](./TESTING_PET_TRANSFER.md).

```bash
pnpm --filter pawbuck test __tests__/navigation/familyTransferEntryPoints.test.tsx __tests__/services/householdInvites.service.test.ts __tests__/services/petFamilyInvites.service.test.ts __tests__/services/petTransfers.service.test.ts __tests__/app/accept-invite.test.tsx
```

- Run: `cd apps/consumer-app && pnpm test`

## Supabase Edge (email → health pipeline)

```bash
deno test supabase/functions/_shared/ supabase/functions/mailgun-process-pet-mail/__tests__/ supabase/functions/process-pet-mail/__tests__/ --allow-read --allow-env
```

- **`processHealthAttachments.ts`** — matrix tests in `_shared/email-health-ingestion/processHealthAttachments_test.ts` (vault, legacy OCR, forced doc type, validation skip, microchip callback).
- **Mailgun idempotency / sender responses** — `mailgun-process-pet-mail/__tests__/idempotency_and_sender_responses_test.ts`.
- **Legacy OCR deprecation** — `_shared/__tests__/ocr_deprecated_test.ts` (410 when `EDGE_OCR_FUNCTIONS_ENABLED=false`).
- CI: `.github/workflows/supabase-edge-tests.yml`.

## Admin dashboard (email ops + health explorer)

- **Panels** — `__tests__/components/EmailHealthPanels.test.tsx` (ProcessedEmails, EmailOps, DocumentProcessingMetrics, PetHealthExplorer).
- Run: `pnpm --filter pawbuck-admin-dashboard test`

## MiloController & RAG (PawBuck.API)

- **`MiloControllerTests`** — all routes: `POST chat`, `POST ask`, `POST chat/feedback`, journal sessions, vet draft, curated-guidance (`backend/PawBuck.API.Tests/Controllers/MiloControllerTests.cs`).
- **`MiloRagServiceTests`** — FAQ RAG / General Help fallback (`Services/MiloRagServiceTests.cs`).
- **`MiloReasoningServiceRoutingTests`** — journal tree routing, heuristic-only doc RAG, access guards.
- **`MiloJournalFeedbackRulesTests`** — 14-day window + rating validation (extracted from `MiloJournalTurnService`).
- **Support admin journal** — `SupportMiloJournalControllerTests` includes `GET feedback-aggregates`.
- **API coverage (report-only in CI)** — `dotnet test --collect:"XPlat Code Coverage"` in `pawbuck-api-ci.yml`.

## API client

- **`miloHealthBundleApi.test.ts`** — `POST /api/milo/health-records/bundle` (`packages/pawbuck-api-client/__tests__/`).

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

### Journal tree interviews (v1.5)

- **Tree JSON schema:** `pnpm milo-journal-trees:test` (or `pnpm --filter @pawbuck/milo-journal-trees test`) validates all files under `packages/milo-journal-trees/trees/`.
- **API:** `dotnet test backend/PawBuck.API.Tests --filter "FullyQualifiedName~JournalTree"` for catalog + interview DTO tests.
- **Flag:** API reads `journalTreeInterviewEnabled` from `milo_journal_config`; consumer can set `EXPO_PUBLIC_JOURNAL_TREE_INTERVIEW=true` for early testing.

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
