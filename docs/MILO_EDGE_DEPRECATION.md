# Milo Edge deprecation (legacy)

**Status:** Deprecated as of 2026-06-26. **Do not deploy or call** legacy Milo Edge paths for product chat or FAQ ingest.

## What was deprecated

| Component | Path | Replacement |
|-----------|------|-------------|
| Edge **`milo-chat`** | `supabase/functions/milo-chat/` | **`POST /api/milo/chat`** on PawBuck.API (consumer: `EXPO_PUBLIC_PAWBUCK_API_URL`) |
| Legacy copy **`milo-chat`** | `apps/consumer-app/supabase/functions/milo-chat/` | Not deployed; kept for reference only |
| Edge **`add-faq`** | `supabase/functions/add-faq/` | Edit [`docs/pawbuck-product-help/`](../docs/pawbuck-product-help/) → [`seed-documentation-rag.ts`](../apps/consumer-app/scripts/seed-documentation-rag.ts) |
| Script **`seed-faq-vectors.ts`** | `apps/consumer-app/scripts/` | Use **`seed-documentation-rag.ts`** |
| Vector index **`faq_documents`** / **`match_documents`** (1536-dim) | Postgres | **`documentation`** / **`match_documentation`** (768-dim) |

## Validation summary (why this is safe)

- Consumer app calls **`fetchMiloChat`** → **`/api/milo/chat`** only (`miloChatApi.ts`, `chatContext.tsx`). No `supabase.functions.invoke("milo-chat")`.
- PawBuck.API Milo RAG uses **`documentation`** via [`KnowledgeBaseService`](../backend/PawBuck.API/Services/KnowledgeBaseService.cs).
- Canonical deploy config: [`supabase/config.toml`](../supabase/config.toml) sets **`milo-chat`** and **`add-faq`** to **`enabled = false`**.
- Deployed root `milo-chat` did not use `faq_documents`; only the legacy consumer-app copy had `search_faqs`.

## FAQ / product help workflow (canonical)

1. Edit Markdown under [`docs/pawbuck-product-help/`](../docs/pawbuck-product-help/).
2. Update [`INVENTORY.md`](../docs/pawbuck-product-help/INVENTORY.md) when routes change.
3. Re-seed vectors:

   ```bash
   cd apps/consumer-app
   npx tsx scripts/seed-documentation-rag.ts --env-file .env.local
   ```

See [`docs/MILO_RAG.md`](MILO_RAG.md) and [`.cursor/rules/milo-product-help.mdc`](../.cursor/rules/milo-product-help.mdc).

## Deploy notes

After merging this deprecation:

1. Redeploy Supabase Edge from repo root `supabase/` so disabled functions are removed from the project (or redeploy all functions with current config).
2. Optional: Supabase dashboard → Edge Functions → confirm **`milo-chat`** / **`add-faq`** are gone or return **410** if an old revision remains until redeploy.
3. Confirm **`documentation`** is seeded in each environment (empty table = Milo product-help answers miss RAG).

## Database (not dropped yet)

Tables **`faq_source`**, **`faq_documents`**, and RPC **`match_documents`** remain in Postgres for rollback. No app or API path reads them after this deprecation. A future migration may drop them after a retention window—update [`docs/compliance/inventoried-tables.txt`](../docs/compliance/inventoried-tables.txt) when that happens.

## Rollback (emergency only)

1. Set `[functions.milo-chat] enabled = true` (and optionally `add-faq`) in `supabase/config.toml`.
2. Redeploy Edge functions.
3. Re-enable only if PawBuck.API is unavailable—consumer app is not wired to Edge Milo by default.
