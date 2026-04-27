# Manual SQL seeds (not auto-applied)

These files are **not** run by `supabase db push` / migration order unless you copy them into `supabase/migrations/`. Apply from the **Supabase SQL Editor** when you want a one-off operation.

| File | Purpose |
|------|--------|
| [`documentation_manual_placeholder.sql`](documentation_manual_placeholder.sql) | Inserts `public.documentation` rows from `docs/pawbuck-product-help/` with **zero vectors** so Milo has text before you can run the TS embedder. Regenerate with `node apps/consumer-app/scripts/generate-documentation-manual-sql.mjs`. |

For production-quality RAG, prefer [`apps/consumer-app/scripts/seed-documentation-rag.ts`](../../apps/consumer-app/scripts/seed-documentation-rag.ts) (real 768-dim embeddings). See [`docs/MILO_RAG.md`](../../docs/MILO_RAG.md).
