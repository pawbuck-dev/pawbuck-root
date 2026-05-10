# PawBuck product help (Milo RAG corpus)

Markdown sources for **`public.documentation`** (768-dim embeddings, `match_documentation`). The consumer app no longer ships a separate FAQ screen; users are directed to **Milo**.

- **Inventory:** [INVENTORY.md](./INVENTORY.md)
- **Seed:** from repo root, run the script documented in [../../docs/MILO_RAG.md](../../docs/MILO_RAG.md) (`seed-documentation-rag.ts`).

Edit these files when product flows change, then re-run the seed script for your Supabase project.

Starter chip strings for the Milo modal live in [`../../apps/consumer-app/constants/productHelpStarters.ts`](../../apps/consumer-app/constants/productHelpStarters.ts) and in [`../../apps/consumer-app/services/miloSuggestedPrompts.ts`](../../apps/consumer-app/services/miloSuggestedPrompts.ts) (health-records screen); update when you add major topics.

New or renamed articles (for example `15-documents-id-invoices.md`) are picked up automatically by the seed script—only `INVENTORY.md` and `README.md` are skipped as index files.
