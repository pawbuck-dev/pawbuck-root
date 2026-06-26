# Milo model comparison report

**Date:** YYYY-MM-DD  
**Author:**  
**Baseline model:** gemini-2.5-flash  
**Candidate model:**  
**Environment:** staging  

## Summary

- [ ] Stay on baseline
- [ ] Adopt candidate
- [ ] Defer — needs prompt tuning

## Deterministic suites

| Suite | Baseline | Candidate |
|-------|----------|-----------|
| `MiloDocumentExtractionEvalTests` | pass / fail | pass / fail |
| `MiloChatSafetyEvalTests` | pass / fail | pass / fail |
| `MiloJournalRedFlagEvalTests` | pass / fail | pass / fail |
| `pnpm run milo:eval` | pass / fail | pass / fail |

## Live Gemini (MILO_EVAL_LIVE=1)

| Test | Baseline | Candidate |
|------|----------|-----------|
| `MiloVisionEvalLiveTests` | | |
| `MiloChatSafetyEvalLiveTests` | | |

## Latency & cost (staging)

| Path | Baseline p95 ms | Candidate p95 ms |
|------|-----------------|-------------------|
| `/api/milo/chat` | | |
| Vision classify+extract | | |

| Cost / 1k Milo Gemini calls | Baseline | Candidate |
|------------------------------|----------|-----------|

## Notes

- Prompt or RAG changes bundled with this model change?
- Compliance / disclosure updates needed?

## Approval

- [ ] Engineering
- [ ] Product (if user-visible tone change)
