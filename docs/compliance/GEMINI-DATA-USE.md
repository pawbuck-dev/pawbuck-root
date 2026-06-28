# Gemini API — data use and training (engineering)

**Not legal advice.** Pair with counsel for DPA sign-off and privacy-policy wording.

## Summary

PawBuck sends pet health data to **Google Gemini** (Generative Language API, `generativelanguage.googleapis.com`) for Milo chat, document classify/extract, email ingestion helpers, and RAG embeddings. The mobile app never calls Gemini directly — only **PawBuck.API** and **Supabase Edge Functions** do.

**Model training:** Under [Google Gemini API Paid Services terms](https://ai.google.dev/gemini-api/terms), Google **does not** use your prompts (including system instructions and uploaded files) or model responses to improve Google products when billing is enabled on the API project. **Unpaid / free quota** is the opposite — do not use free-tier keys with real pet data.

## Production billing status (verified)

| Item | Status |
|------|--------|
| Billing account | Pawbuck Billing Account |
| API tier | **Tier 1 · Prepay** (paid) |
| Verified | 2026-06-28 (engineering) |
| API keys in screenshot/docs | Never commit or paste keys; store in AWS Secrets Manager / Supabase secrets only |

Re-check quarterly in [Google AI Studio → API keys](https://aistudio.google.com/apikey): project must remain on a **Paid** plan linked to active billing.

## What still reaches Google (even on paid tier)

Paid tier stops **product/model training** on prompt/response content. Google may still:

- Process requests to return model output (necessary for the feature).
- Retain prompts/responses **briefly** for **Prohibited Use Policy** / abuse detection (per Google terms).
- Collect **usage metadata** (token counts, errors, IP) under controller terms — not the full health payload for training.

Optional stricter posture: [Zero Data Retention (ZDR)](https://ai.google.dev/gemini-api/docs/zdr) on the GCP project (requires Google approval; separate from paid-tier no-training).

## What PawBuck sends (by path)

| Path | Data categories |
|------|-----------------|
| `POST /api/milo/chat` | User message, history, pet profile, authorized health rows, journal text |
| Milo vision (`MiloVisionService`) | Full PDF/image bytes of vet documents |
| Email Edge (default vault pipeline) | Attachment bytes, subject; may also call API analyze-internal (second Gemini pass) |
| Embeddings (`gemini-embedding-2`) | Query text for FAQ RAG |
| `ProactivePetHealthWorker` | Pet name + truncated journal excerpt |

GPS walk coordinates are **not** sent to Gemini. See code map in prior engineering review (`MiloReasoningService`, `MiloVisionService`, `supabase/functions/_shared/gemini-api.ts`).

## What PawBuck does **not** do

- No Gemini **model tuning** / fine-tuning uploads in production.
- No automatic export of user feedback to Google for training.
- No code-level “training opt-out” flag — paid tier + contract is the control (API has no separate training header in our integration).

## Do not opt in to training elsewhere

Even on paid API accounts, **Google AI Studio → Logs & Datasets → Share with Google** treats contributed datasets under unpaid-service data-use terms for model improvement. **Do not share** production Milo or OCR logs/datasets with Google.

## Operational checklist

Use the same paid project/key everywhere production pet data flows:

- [x] Production Gemini project on **Tier 1 · Prepay** / Paid (2026-06-28)
- [ ] **Same paid key** on ECS (`Gemini__ApiKey` / Secrets Manager) — not a personal free-tier key
- [ ] **Same paid key** on Supabase Edge (`GOOGLE_GEMINI_API_KEY`) for email classify/validate
- [ ] Dev/local `.env` keys: free tier OK for synthetic data only; never copy prod health records against free keys
- [ ] Google Cloud **DPA** executed and filed (counsel)
- [ ] No AI Studio log/dataset sharing enabled for this project
- [ ] No use of Gemini **model tuning** feature for pet health content
- [ ] Privacy policy / subprocessors list mentions Google Gemini (health-adjacent AI)
- [ ] Optional: ZDR request if counsel wants minimal Google-side logging

## Counsel / policy (still open)

- [ ] DPA sign-off referenced in [COMPLIANCE-BACKLOG.md](../COMPLIANCE-BACKLOG.md)
- [ ] Published privacy policy lists Gemini under subprocessors ([SUBPROCESSORS.md](./SUBPROCESSORS.md))

## References

- [Gemini API terms — Paid vs Unpaid Services](https://ai.google.dev/gemini-api/terms)
- [Gemini API logs policy](https://ai.google.dev/gemini-api/docs/logs-policy)
- [AWS.md — Gemini on ECS](../AWS.md)
- [MILO_RAG.md](../MILO_RAG.md)
