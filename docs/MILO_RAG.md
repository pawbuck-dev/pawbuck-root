# Milo RAG and knowledge architecture

Operational guide for FAQ retrieval, curated grounding, and PawBuck.API Milo.

**Legacy Edge Milo** (`milo-chat`, `add-faq`, `faq_documents`) is **retired** — see [`MILO_EDGE_DEPRECATION.md`](MILO_EDGE_DEPRECATION.md).

## In-app chat (canonical)

The **Expo consumer** chat modal calls **`POST /api/milo/chat`** on **PawBuck.API** with a **Supabase user JWT** and optional `pet` + `history`. The server runs **Gemini plan JSON → Npgsql pet facts (owner-scoped) → optional `documentation` RAG → optional curated snippets → final answer** ([`MiloReasoningService`](../backend/PawBuck.API/Services/MiloReasoningService.cs)). Configure **`EXPO_PUBLIC_PAWBUCK_API_URL`** and **`Supabase:JwtSecret`** (or `SUPABASE_JWT_SECRET`) on the API so tokens validate.

**Journal mode** uses the same endpoint with `journalMode: true` and a verified `pet`: Gemini returns **JSON** (`answer`, `suggestedReplies`, `status`, `summary`, optional `vetNotification`). A **red-flag stop** sets `journalEmergencyStop: true` so the client does not persist a journal row. See [`docs/pawbuck-product-help/11-pet-journal.md`](../docs/pawbuck-product-help/11-pet-journal.md).

## Vector RAG (single corpus)

**Canonical:** **`documentation` + `match_documentation` (768-dim)**

- **API:** PawBuck.API embeds with Gemini `gemini-embedding-2` at **768** dims ([`GeminiEmbeddingService`](../backend/PawBuck.API/Services/GeminiEmbeddingService.cs)).
- **Use:** FAQ RAG for **`POST /api/milo/ask`** and optional RAG inside **`POST /api/milo/chat`** when the plan requests documentation.

**Retired (do not seed or query for Milo):** **`faq_documents` + `match_documents` (1536-dim)** — legacy Edge `milo-chat` / `add-faq`. Tables remain in Postgres for rollback only.

### Product help corpus (consumer FAQ + how-tos)

- **Authoritative Markdown:** [`docs/pawbuck-product-help/`](../docs/pawbuck-product-help/) — feature how-tos and general FAQ, indexed for Milo. See [`INVENTORY.md`](../docs/pawbuck-product-help/INVENTORY.md) for coverage vs app routes.
- **Seed script:** from `apps/consumer-app` (with `.env.local` containing `EXPO_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_GEMINI_API_KEY`):

  ```bash
  cd apps/consumer-app
  npx tsx scripts/seed-documentation-rag.ts
  ```

  The script loads env from **repo root** or **`apps/consumer-app`** `.env` / `.env.local` (merged; later files override). You can also pass `--env-file path/to/.env.local`. Required: `EXPO_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_GEMINI_API_KEY` (see `apps/consumer-app/.env.example` comments).

**Manual SQL (no Gemini):** If you only need rows present for testing, run [`supabase/manual-seeds/documentation_manual_placeholder.sql`](../supabase/manual-seeds/documentation_manual_placeholder.sql) in the SQL Editor, then replace with the TS seed when you have API keys. Regenerate that file after editing help Markdown: `node apps/consumer-app/scripts/generate-documentation-manual-sql.mjs`. See [`supabase/manual-seeds/README.md`](../supabase/manual-seeds/README.md).

  Optional: `npx tsx scripts/seed-documentation-rag.ts --dry-run` parses and chunks only (no Supabase writes; uses zero vectors).

- **Embeddings:** the script uses **`output_dimensionality: 768`** on `gemini-embedding-2`, matching `match_documentation` and [`KnowledgeBaseService`](../backend/PawBuck.API/Services/KnowledgeBaseService.cs). Metadata includes `source_path`, `content_hash`, `corpus_version`, and `published_at`.

## Curated snippets (grounding without vectors)

Table **`milo_curated_snippets`** (root `supabase/migrations`) holds **editorial** lines (e.g. typical breed weight *ranges* as general education).  

- **API:** `GET /api/milo/curated-guidance` (internal key) and **`POST /api/milo/chat`** when topics match (`MiloCuratedTopicHeuristic`).
- Chat responses may include **`sources`** (`documentation` | `curated` | `pet_record`).

## Future work

- Drop **`faq_documents`** / **`match_documents`** after retention window (see [`MILO_EDGE_DEPRECATION.md`](MILO_EDGE_DEPRECATION.md)).
- Milo eval suite + cost optimization: [`docs/plans/milo-domain-ai-platform.md`](plans/milo-domain-ai-platform.md).

## Environment variables

| Variable | Where | Purpose |
|---------|--------|---------|
| `GOOGLE_GEMINI_API_KEY` | API (+ seed scripts) | Gemini models / embeddings |
| `SUPABASE_JWT_SECRET` / `Supabase:JwtSecret` | API | Validate user JWTs for **`POST /api/milo/chat`** |
| `EXPO_PUBLIC_PAWBUCK_API_URL` | Consumer Expo | Base URL for PawBuck.API (e.g. `http://localhost:5xxx`) |
| `MILO_INTERNAL_SERVICE_KEY` | API appsettings | Shared secret for `GET /api/milo/curated-guidance` |

## Compliance

Health-adjacent answers must stay within app disclosures; curated copy should include attribution and **not** replace a veterinarian. See [COMPLIANCE-BACKLOG.md](COMPLIANCE-BACKLOG.md).
