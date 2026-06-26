# Milo eval suite (Phase 2)

Regression tests for Milo document extraction, chat safety, journal red flags, and model upgrades.

**Plan:** [`docs/plans/milo-domain-ai-platform.md`](../docs/plans/milo-domain-ai-platform.md) § Phase 2.

## Layout

```
eval/milo/
  document-extraction/fixtures.json   # ≥15 golden expected JSON payloads
  chat-safety/scenarios.json          # ≥20 behavior scenarios
  journal-red-flags/scenarios.json    # ≥10 tree + legacy journal cases
  journal-red-flags/vet-notification-examples.json
  model-upgrade/RUNBOOK.md            # model change gate
  fixtures/                           # optional sanitized PDFs/images (live only)
```

## Run (deterministic — default CI)

From repo root:

```bash
# TypeScript fixture/schema checks (@pawbuck/milo)
pnpm run milo:eval

# .NET eval tests (excludes live Gemini)
dotnet test backend/PawBuck.API.Tests/PawBuck.API.Tests.csproj --filter "Category!=MiloEvalLive"
```

Or full backend suite:

```bash
pnpm run backend:test
```

## Run (live Gemini — nightly / pre-release)

Requires `GOOGLE_GEMINI_API_KEY` and explicit opt-in:

```bash
export MILO_EVAL_LIVE=1
export GOOGLE_GEMINI_API_KEY=...
# optional: export GEMINI_MODEL=gemini-2.5-flash

dotnet test backend/PawBuck.API.Tests/PawBuck.API.Tests.csproj --filter "Category=MiloEvalLive"
```

GitHub Actions: [`.github/workflows/milo-eval-nightly.yml`](../.github/workflows/milo-eval-nightly.yml) (manual + nightly schedule).

## Model upgrade gate

Before changing `Gemini:Model` / ECS `Gemini__Model`, follow [`model-upgrade/RUNBOOK.md`](model-upgrade/RUNBOOK.md) and attach a completed report from [`model-upgrade/report-template.md`](model-upgrade/report-template.md).

## Adding cases

| Suite | File | Assertions |
|-------|------|------------|
| Extraction | `document-extraction/fixtures.json` | Schema + key fields via `MiloDocumentExtractionAssertions` |
| Chat safety | `chat-safety/scenarios.json` | `mustContainAny/All/NotContain` via `MiloChatSafetyAssertions` |
| Journal | `journal-red-flags/scenarios.json` | Tree chips → `JournalTreeRedFlagEvaluator`; legacy → `EMERGENCY_RED_FLAG` token |
| Vet format | `journal-red-flags/vet-notification-examples.json` | `VetNotificationPlainTextComposer` vs spec |

## Exit criteria (Phase 2)

- [x] ≥15 document fixtures
- [x] ≥20 chat safety scenarios
- [x] ≥10 journal red-flag scenarios
- [x] This README + model upgrade runbook
- [ ] One completed model comparison report when changing production model
