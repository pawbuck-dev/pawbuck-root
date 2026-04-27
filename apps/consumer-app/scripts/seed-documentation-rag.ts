/**
 * Seed public.documentation for PawBuck.API Milo chat RAG (768-dim, gemini-embedding-2).
 * Reads Markdown from docs/pawbuck-product-help at monorepo root (resolved from this file).
 *
 * Usage (from apps/consumer-app or repo root):
 *   cd apps/consumer-app && npx tsx scripts/seed-documentation-rag.ts
 *   npx tsx apps/consumer-app/scripts/seed-documentation-rag.ts --env-file apps/consumer-app/.env.local
 *
 * Env files tried (later overrides earlier): repo `.env` / `.env.local`, then `apps/consumer-app/.env` / `.env.local`,
 * then the path passed with `--env-file` (resolved against cwd).
 *
 * Requires:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (not EXPO_* — never ship service role in the app)
 *   GOOGLE_GEMINI_API_KEY (preferred; not EXPO_PUBLIC_* — Gemini key is a secret)
 *
 * Optional:
 *   --dry-run   Parse and chunk only, no DB writes
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// scripts/ → consumer-app → apps → monorepo root (docs/ lives at repo root)
const consumerAppRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(consumerAppRoot, "..", "..");
const helpDir = path.resolve(repoRoot, "docs/pawbuck-product-help");

function loadEnvFiles(): void {
  const argv = process.argv;
  const flagIdx = argv.indexOf("--env-file");
  const explicitArg = flagIdx !== -1 && argv[flagIdx + 1] ? argv[flagIdx + 1] : null;
  const explicitPath = explicitArg ? path.resolve(process.cwd(), explicitArg) : null;

  const chain: string[] = [
    path.join(repoRoot, ".env"),
    path.join(repoRoot, ".env.local"),
    path.join(consumerAppRoot, ".env"),
    path.join(consumerAppRoot, ".env.local"),
    path.resolve(process.cwd(), ".env.local"),
  ];
  if (explicitPath) chain.push(explicitPath);

  const seen = new Set<string>();
  const loaded: string[] = [];
  for (const p of chain) {
    const norm = path.normalize(p);
    if (seen.has(norm) || !fs.existsSync(p)) continue;
    seen.add(norm);
    dotenv.config({ path: p, override: true });
    loaded.push(p);
  }
  if (loaded.length > 0) {
    console.error(`[seed-documentation-rag] Loaded env from: ${loaded.join(" → ")}`);
  } else {
    console.warn("[seed-documentation-rag] No .env file found; using process.env only.");
  }
}

loadEnvFiles();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.EXPO_SUPABASE_SERVICE_ROLE_KEY?.trim();
if (
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() == null &&
  process.env.EXPO_SUPABASE_SERVICE_ROLE_KEY?.trim() != null
) {
  console.warn(
    "[seed-documentation-rag] Using EXPO_SUPABASE_SERVICE_ROLE_KEY; rename to SUPABASE_SERVICE_ROLE_KEY in .env.local (service role must not use EXPO_PUBLIC_* or ship to clients)."
  );
}
const GOOGLE_GEMINI_API_KEY =
  process.env.GOOGLE_GEMINI_API_KEY?.trim() || process.env.EXPO_GOOGLE_GEMINI_API_KEY?.trim();
if (
  process.env.GOOGLE_GEMINI_API_KEY?.trim() == null &&
  process.env.EXPO_GOOGLE_GEMINI_API_KEY?.trim() != null
) {
  console.warn(
    "[seed-documentation-rag] Using EXPO_GOOGLE_GEMINI_API_KEY; rename to GOOGLE_GEMINI_API_KEY in .env.local (avoid EXPO_PUBLIC_* for API keys)."
  );
}

/** Retired on API: text-embedding-004 → use gemini-embedding-2 + output_dimensionality (768). */
const EMBED_MODEL = "gemini-embedding-2";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const EMBED_DIM = 768;

const SKIP_NAMES = new Set(["INVENTORY.md", "README.md"]);

function chunkMarkdown(fileName: string, body: string): { text: string; sectionHint: string }[] {
  const titleMatch = body.match(/^#\s+(.+)$/m);
  const docTitle = titleMatch?.[1]?.trim() ?? fileName.replace(/\.md$/i, "");
  const parts = body.split(/\n(?=##\s)/g).map((p) => p.trim()).filter(Boolean);
  const out: { text: string; sectionHint: string }[] = [];
  const maxLen = 1800;

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.length <= maxLen) {
      out.push({ text: `${docTitle}\n\n${p}`, sectionHint: p.split("\n")[0]?.slice(0, 120) ?? docTitle });
      continue;
    }
    let start = 0;
    while (start < p.length) {
      const slice = p.slice(start, start + maxLen);
      out.push({ text: `${docTitle}\n\n${slice}`, sectionHint: `part-${start}` });
      start += maxLen;
    }
  }

  if (out.length === 0) {
    out.push({ text: `${docTitle}\n\n${body.trim()}`, sectionHint: docTitle });
  }
  return out;
}

async function embedText(text: string): Promise<number[]> {
  const url = `${GEMINI_API_BASE}/${EMBED_MODEL}:embedContent?key=${GOOGLE_GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      output_dimensionality: EMBED_DIM,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Embed API error: ${res.status} ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as { embedding?: { values?: number[] } };
  const values = data?.embedding?.values;
  if (!values || !Array.isArray(values) || values.length !== EMBED_DIM) {
    throw new Error(`Invalid embedding response (expected ${EMBED_DIM} dims)`);
  }
  return values;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  if (!dryRun) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error(
        "Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
          "Add them to apps/consumer-app/.env.local or repo-root .env.local (see Supabase Project Settings → API).\n" +
          "Service role key is secret — never commit it. Example keys in apps/consumer-app/.env.example (anon); scripts need the service_role key."
      );
      process.exit(1);
    }
    if (!GOOGLE_GEMINI_API_KEY) {
      console.error("Missing GOOGLE_GEMINI_API_KEY (or EXPO_GOOGLE_GEMINI_API_KEY fallback).");
      process.exit(1);
    }
  } else if (!GOOGLE_GEMINI_API_KEY) {
    // Dry-run skips embedding calls; allow running without Gemini for CI chunk smoke.
    console.warn("Note: GOOGLE_GEMINI_API_KEY not set (dry-run uses zero vectors only if embedding were called).");
  }
  if (!fs.existsSync(helpDir)) {
    console.error("Help directory not found:", helpDir);
    process.exit(1);
  }

  const files = fs
    .readdirSync(helpDir)
    .filter((f) => f.endsWith(".md") && !SKIP_NAMES.has(f))
    .sort();

  const rows: {
    content: string;
    embedding: number[];
    metadata: Record<string, unknown>;
  }[] = [];

  for (const file of files) {
    const full = path.join(helpDir, file);
    const body = fs.readFileSync(full, "utf8");
    const chunks = chunkMarkdown(file, body);
    let idx = 0;
    for (const { text, sectionHint } of chunks) {
      console.log(`Embedding ${file} chunk ${idx} (${text.length} chars)...`);
      const embedding = dryRun ? new Array(EMBED_DIM).fill(0) : await embedText(text);
      rows.push({
        content: text,
        embedding,
        metadata: {
          source_file: file,
          chunk_index: idx,
          section: sectionHint,
          corpus: "pawbuck-product-help",
        },
      });
      idx++;
    }
  }

  if (dryRun) {
    console.log(`Dry run: ${rows.length} chunks from ${files.length} files.`);
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("Clearing public.documentation...");
  const { error: delErr } = await supabase.from("documentation").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delErr) {
    console.warn("Delete warning:", delErr.message);
  }

  console.log(`Inserting ${rows.length} rows...`);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const { error } = await supabase.from("documentation").insert({
      content: row.content,
      embedding: row.embedding,
      metadata: row.metadata,
    });
    if (error) {
      console.error("Insert failed at row", i, error);
      process.exit(1);
    }
    process.stdout.write(".");
  }
  console.log("\nDone. documentation table is ready for match_documentation (768d).");
}

main();
