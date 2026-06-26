# Milo model upgrade gate (Phase 2E)

Run this **before** changing production `Gemini:Model` (`appsettings.json`, ECS `Gemini__Model`, or `GEMINI_MODEL`).

## 1. Candidate on staging

```bash
export MILO_EVAL_LIVE=1
export GOOGLE_GEMINI_API_KEY=...
export GEMINI_MODEL=<candidate-model-id>   # e.g. gemini-2.5-flash

dotnet test backend/PawBuck.API.Tests/PawBuck.API.Tests.csproj --filter "Category=MiloEvalLive"
dotnet test backend/PawBuck.API.Tests/PawBuck.API.Tests.csproj --filter "FullyQualifiedName~MiloEval"
pnpm run milo:eval
pnpm run milo:test
```

## 2. Compare metrics

| Metric | Baseline (current prod model) | Candidate |
|--------|------------------------------|-----------|
| Document extraction pass rate (golden fixtures) | | |
| Chat safety pass rate (live subset) | | |
| Journal red-flag deterministic pass rate | | |
| p95 `/api/milo/chat` latency (staging load) | | |
| Gemini $ / 1k Milo calls (CloudWatch / ops-health) | | |

Use [`report-template.md`](report-template.md) for the PR record.

## 3. Ship decision

- **Ship candidate** only if no regression on deterministic suites and safety/live subset passes.
- **Stay on current model** — document in PR anyway (valid outcome).
- Update [`docs/AWS.md`](../../docs/AWS.md) when production model changes.

## 4. Rollback

Revert ECS `Gemini__Model` / appsettings to previous value; redeploy API. Re-run deterministic eval to confirm.
