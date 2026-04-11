# Milo RAG and knowledge architecture

Operational guide for FAQ retrieval, curated grounding, and how **Edge** vs **PawBuck.API** interact.

## In-app chat (canonical)

The **Expo consumer** chat modal calls **`POST /api/milo/chat`** on **PawBuck.API** with a **Supabase user JWT** and optional `pet` + `history`. The server runs **Gemini plan JSON → Npgsql pet facts (owner-scoped) → optional `documentation` RAG → final answer** ([`MiloReasoningService`](../backend/PawBuck.API/Services/MiloReasoningService.cs)). Configure **`EXPO_PUBLIC_PAWBUCK_API_URL`** and **`Supabase:JwtSecret`** (or `SUPABASE_JWT_SECRET`) on the API so tokens validate.

The Edge function **`milo-chat`** is **deprecated** for the app (kept for legacy experiments only).

## Chosen split (vectors)

We run **two vector indexes** on purpose until a consolidation project merges them:

1. **`faq_documents` + `match_documents` (1536-dim)**  
   - **Legacy Edge:** embeds with Gemini `text-embedding-004` at **1536** output dimensionality ([`milo-chat/tools/knowledge.ts`](../apps/consumer-app/supabase/functions/milo-chat/tools/knowledge.ts)).  
   - **Use:** Short FAQ / product-help when using **deprecated** Edge `milo-chat` tools.  
   - **Ingest:** `faq_source` sync → `faq_documents` (see `apps/consumer-app/supabase/migrations/` for FAQ tables; canonical DB may mirror via root migrations).

2. **`documentation` + `match_documentation` (768-dim)**  
   - **API:** PawBuck.API embeds with Gemini `text-embedding-004` at **768** dims ([`GeminiEmbeddingService`](../backend/PawBuck.API/Services/GeminiEmbeddingService.cs)).  
   - **Use:** FAQ RAG for **`POST /api/milo/ask`** and optional RAG inside **`POST /api/milo/chat`** when the plan requests documentation.

**Do not** assume the two RPCs are interchangeable: dimensions and tables differ.

## Curated snippets (grounding without vectors)

Table **`milo_curated_snippets`** (root `supabase/migrations`) holds **editorial** lines (e.g. typical breed weight *ranges* as general education).  

- **Edge:** tool `get_curated_pet_guidance` reads rows via Supabase service client.  
- **API:** `GET /api/milo/curated-guidance` returns the same rows when called with **`X-Pawbuck-Milo-Internal-Key`** (optional bridge for other services).  
- If **`PAWBUCK_API_URL`** + **`MILO_INTERNAL_SERVICE_KEY`** are set on Edge, the tool **prefers the API**; otherwise it queries Postgres directly.

## Future consolidation options

- **Option A — Single FAQ index:** Re-embed everything into one table + one RPC; migrate Edge `search_faqs` and API `KnowledgeBaseService` together.  
- **Option B — Keep split:** `faq_documents` = chat FAQs; `documentation` = API/long-form only; document in this file only (current stance).  
- **Option C — API-only retrieval:** Edge calls PawBuck for every snippet (latency + auth); use when versioning and audit must live in .NET only.

## Environment variables

| Variable | Where | Purpose |
|---------|--------|---------|
| `GOOGLE_GEMINI_API_KEY` | Edge + API | Gemini models / embeddings |
| `SUPABASE_JWT_SECRET` / `Supabase:JwtSecret` | API | Validate user JWTs for **`POST /api/milo/chat`** |
| `EXPO_PUBLIC_PAWBUCK_API_URL` | Consumer Expo | Base URL for PawBuck.API (e.g. `http://localhost:5xxx`) |
| `MILO_INTERNAL_SERVICE_KEY` | Edge + API appsettings | Shared secret for `GET /api/milo/curated-guidance` |
| `PAWBUCK_API_URL` | Edge (optional) | Base URL for PawBuck.API (e.g. `https://api.example.com`) |

Shared Edge helpers: [`apps/consumer-app/supabase/functions/_shared/pawbuck-milo-api.ts`](../apps/consumer-app/supabase/functions/_shared/pawbuck-milo-api.ts).

## Compliance

Health-adjacent answers must stay within app disclosures; curated copy should include attribution and **not** replace a veterinarian. See [COMPLIANCE-BACKLOG.md](COMPLIANCE-BACKLOG.md).
