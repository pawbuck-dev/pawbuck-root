/**
 * Generates supabase/manual-seeds/documentation_manual_placeholder.sql
 * from docs/pawbuck-product-help/*.md (one row per file, zero 768-dim vector).
 *
 * Run from anywhere:
 *   node apps/consumer-app/scripts/generate-documentation-manual-sql.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const consumerAppRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(consumerAppRoot, "..", "..");
const helpDir = path.join(repoRoot, "docs", "pawbuck-product-help");
const skip = new Set(["INVENTORY.md", "README.md"]);

const files = fs
  .readdirSync(helpDir)
  .filter((f) => f.endsWith(".md") && !skip.has(f))
  .sort();

const valueRows = [];
for (const f of files) {
  const body = fs.readFileSync(path.join(helpDir, f), "utf8");
  const tag = `pbdoc_${f.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const meta = JSON.stringify({
    corpus: "pawbuck-product-help-manual",
    source_file: f,
  });
  const delim = `$${tag}$`;
  valueRows.push(
    `(\n${delim}\n${body}\n${delim},\n  '${meta.replace(/'/g, "''")}'::jsonb)`
  );
}

const sql = `-- Manual seed: public.documentation (placeholder embeddings only)
-- Apply in Supabase SQL Editor (or psql) on the project PawBuck.API uses.
--
-- LIMITATIONS: Every row shares the same zero vector. match_documentation will
-- return arbitrary rows for a real query embedding. For production, run:
--   cd apps/consumer-app && npx tsx scripts/seed-documentation-rag.ts
-- which clears and reloads with proper Gemini gemini-embedding-2 (768) vectors.
--
-- Idempotent: deletes rows tagged corpus = pawbuck-product-help-manual first.

BEGIN;

DELETE FROM public.documentation WHERE metadata->>'corpus' = 'pawbuck-product-help-manual';

WITH zero_emb AS (
  SELECT (
    '[' || (SELECT string_agg('0', ',') FROM generate_series(1, 768)) || ']'
  )::extensions.vector(768) AS embedding
)
INSERT INTO public.documentation (content, metadata, embedding)
SELECT v.content, v.metadata, z.embedding
FROM (
VALUES
${valueRows.join(",\n")}
) AS v(content, metadata)
CROSS JOIN zero_emb z;

COMMIT;
`;

const outPath = path.join(repoRoot, "supabase", "manual-seeds", "documentation_manual_placeholder.sql");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, sql, "utf8");
console.log(`Wrote ${outPath} (${files.length} rows from ${files.length} files).`);
