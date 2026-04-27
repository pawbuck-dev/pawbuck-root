/**
 * FAQ management: add FAQs or sync vectors from source table. No large FAQ list in code — scales to 1000+.
 *
 * POST body:
 *   - { "sync": true } — rebuild faq_documents from faq_source (embed all, upsert by faq_source_id).
 *   - { "faqs": [ { "question": "...", "answer": "..." } ] } — insert into faq_source then sync (embeds and writes to faq_documents).
 * Header: x-faq-admin-secret: <FAQ_ADMIN_SECRET> (required)
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  errorResponse,
  handleCorsRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase-utils.ts";

const EMBED_MODEL = "gemini-embedding-2";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const EMBED_DIM = 1536;

async function embedText(text: string): Promise<number[]> {
  const key = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!key) throw new Error("GOOGLE_GEMINI_API_KEY not configured");

  const url = `${GEMINI_API_BASE}/${EMBED_MODEL}:embedContent?key=${key}`;
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
    throw new Error("Invalid embedding response");
  }
  return values;
}

// @ts-expect-error Deno is provided by Supabase Edge runtime
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCorsRequest();

  try {
    const secret = req.headers.get("x-faq-admin-secret");
    const expected = Deno.env.get("FAQ_ADMIN_SECRET");
    if (!expected || secret !== expected) {
      return errorResponse("Unauthorized", 401);
    }

    const body = (await req.json()) as {
      faqs?: Array<{ question: string; answer: string }>;
      sync?: boolean;
    };

    const supabase = createSupabaseClient();

    if (Array.isArray(body?.faqs) && body.faqs.length > 0) {
      const sourceIds: string[] = [];
      for (const item of body.faqs) {
        const question = String(item?.question ?? "").trim();
        const answer = String(item?.answer ?? "").trim();
        if (!question && !answer) continue;
        const { data: row, error } = await supabase
          .from("faq_source")
          .insert({ question, answer })
          .select("id")
          .single();
        if (error) {
          console.error("[add-faq] faq_source insert error:", error);
          return errorResponse(`Insert failed: ${error.message}`, 500);
        }
        if (row?.id) sourceIds.push(row.id);
      }
      if (sourceIds.length === 0) {
        return jsonResponse({ added: 0, ids: [], message: "No valid faqs" });
      }
      // Sync so new rows get embeddings in faq_documents
      const syncResult = await runSync(supabase);
      return jsonResponse({
        added: sourceIds.length,
        source_ids: sourceIds,
        synced: syncResult.synced,
      });
    }

    if (body?.sync === true) {
      const result = await runSync(supabase);
      return jsonResponse(result);
    }

    return errorResponse(
      'Body must include "sync": true or "faqs": [{ question, answer }, ...]',
      400
    );
  } catch (e) {
    console.error("[add-faq] Error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});

async function runSync(supabase: ReturnType<typeof createSupabaseClient>): Promise<{ synced: number }> {
  const { data: rows, error } = await supabase
    .from("faq_source")
    .select("id, question, answer");
  if (error) {
    console.error("[add-faq] faq_source select error:", error);
    throw new Error(`Sync failed: ${error.message}`);
  }
  if (!rows || rows.length === 0) {
    return { synced: 0 };
  }

  let synced = 0;
  for (const row of rows) {
    const question = String(row.question ?? "").trim();
    const answer = String(row.answer ?? "").trim();
    const content = `${question} ${answer}`.trim();
    if (!content) continue;

    const embedding = await embedText(content);
    const { error: upsertErr } = await supabase.from("faq_documents").upsert(
      {
        faq_source_id: row.id,
        question,
        answer,
        content,
        embedding,
      },
      { onConflict: "faq_source_id" }
    );
    if (upsertErr) {
      console.error("[add-faq] upsert error for source", row.id, upsertErr);
      throw new Error(`Sync upsert failed: ${upsertErr.message}`);
    }
    synced++;
  }
  return { synced };
}
