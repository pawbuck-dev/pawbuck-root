// FAQ search via pgvector (match_documents RPC). Embeds query with Gemini, then similarity search.
import { createSupabaseClient } from "../../_shared/supabase-utils.ts";

const EMBED_MODEL = "gemini-embedding-2";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const EMBED_DIM = 1536;

async function embedQuery(query: string): Promise<number[]> {
  const key = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!key) throw new Error("GOOGLE_GEMINI_API_KEY not configured");

  const url = `${GEMINI_API_BASE}/${EMBED_MODEL}:embedContent?key=${key}`;
  const body = {
    content: { parts: [{ text: query }] },
    output_dimensionality: EMBED_DIM,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Embed API error: ${res.status} ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as { embedding?: { values?: number[] } };
  const values = data?.embedding?.values;
  if (!values || !Array.isArray(values) || values.length !== EMBED_DIM) {
    throw new Error("Invalid embedding response");
  }
  return values;
}

/**
 * Search FAQs by semantic similarity. Uses Gemini to embed the query, then
 * Supabase RPC match_documents for vector search over faq_documents.
 */
export async function search_faqs(query: string): Promise<string> {
  const supabase = createSupabaseClient();

  let embedding: number[];
  try {
    embedding = await embedQuery(query.trim() || "PawBuck app");
  } catch (e) {
    console.error("[knowledge] Embed failed:", e);
    return "No FAQ results found for that question.";
  }

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_threshold: 0.4,
    match_count: 5,
  });

  if (error) {
    console.error("[knowledge] match_documents error:", error.message);
    return "No FAQ results found for that question.";
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return "No FAQ results found for that question.";
  }

  const lines: string[] = [];
  for (const row of data as Array<{ question?: string; answer?: string }>) {
    const q = row.question ?? "";
    const a = row.answer ?? "";
    if (q || a) lines.push(`Q: ${q}\nA: ${a}`);
  }
  return lines.length > 0 ? lines.join("\n\n") : "No FAQ results found for that question.";
}
