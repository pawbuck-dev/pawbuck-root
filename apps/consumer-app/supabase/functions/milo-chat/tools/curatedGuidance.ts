/**
 * Curated educational snippets (milo_curated_snippets). Prefers PawBuck.API when configured.
 */
import {
  getMiloInternalServiceKey,
  getPawbuckApiBaseUrl,
  MILO_INTERNAL_HEADER,
} from "../../_shared/pawbuck-milo-api.ts";
import { createSupabaseClient } from "../../_shared/supabase-utils.ts";

export function normalizeBreedKey(breed: string | undefined | null): string | null {
  if (!breed || !breed.trim()) return null;
  const parts: string[] = [];
  for (const c of breed.trim().toLowerCase()) {
    if (/[a-z0-9]/.test(c)) parts.push(c);
    else if (c === " " || c === "-" || c === "_") parts.push("_");
  }
  let s = parts.join("").replace(/_+/g, "_").replace(/^_|_$/g, "");
  return s.length === 0 ? null : s;
}

function rowMatches(
  row: { breed_key: string | null; animal_type: string | null },
  breedKey: string | null,
  animal: string | null
): boolean {
  const rB = row.breed_key ? row.breed_key.trim().toLowerCase() : null;
  const rA = row.animal_type ? row.animal_type.trim().toLowerCase() : null;
  const b = breedKey?.toLowerCase() ?? null;
  const a = animal?.trim().toLowerCase() ?? null;

  if (rA && a && rA !== a) return false;
  if (!(rB == null || b == null || rB === b)) return false;
  return true;
}

function scoreRow(
  row: { breed_key: string | null; animal_type: string | null },
  breedKey: string | null,
  animal: string | null
): number {
  const rB = row.breed_key ? row.breed_key.trim().toLowerCase() : null;
  const rA = row.animal_type ? row.animal_type.trim().toLowerCase() : null;
  const b = breedKey?.toLowerCase() ?? null;
  const a = animal?.trim().toLowerCase() ?? null;

  if (b && rB === b) return 0;
  if (!rB && rA && a && rA === a) return 1;
  if (!rB && !rA) return 2;
  return 1;
}

async function fetchFromApi(
  breedKey: string | null,
  animalType: string | null,
  topic: string | null
): Promise<string | null> {
  const base = getPawbuckApiBaseUrl();
  const key = getMiloInternalServiceKey();
  if (!base || !key) return null;

  const q = new URLSearchParams();
  if (breedKey) q.set("breed", breedKey);
  if (animalType) q.set("animalType", animalType);
  if (topic) q.set("topic", topic);

  const url = `${base}/api/milo/curated-guidance?${q.toString()}`;
  const res = await fetch(url, {
    headers: { [MILO_INTERNAL_HEADER]: key },
  });
  if (!res.ok) {
    console.warn("[curatedGuidance] API status:", res.status, await res.text().catch(() => ""));
    return null;
  }
  const data = (await res.json()) as Array<{
    topic: string;
    content: string;
    sourceAttribution: string;
  }>;
  if (!Array.isArray(data) || data.length === 0) {
    return "No curated reference snippets matched this breed/topic. Suggest general wellness and a veterinarian visit.";
  }
  return data
    .map(
      (row, i) =>
        `[${i + 1}] (${row.topic}) ${row.content}\n    Source: ${row.sourceAttribution}`
    )
    .join("\n\n");
}

async function fetchFromDb(
  breedKey: string | null,
  animalType: string | null,
  topic: string | null
): Promise<string> {
  const supabase = createSupabaseClient();
  let q = supabase.from("milo_curated_snippets").select("topic, content, source_attribution, breed_key, animal_type");

  if (topic) {
    q = q.eq("topic", topic);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[curatedGuidance] DB error:", error.message);
    return "Could not load curated guidance.";
  }
  if (!data?.length) {
    return "No curated reference snippets in database yet.";
  }

  const animal = animalType?.trim() || null;
  const filtered = data.filter((row) => rowMatches(row, breedKey, animal));
  const pool = filtered.length > 0 ? filtered : data;

  const ranked = [...pool].sort(
    (a, b) => scoreRow(a, breedKey, animal) - scoreRow(b, breedKey, animal)
  );
  const top = ranked.slice(0, 8);

  return top
    .map(
      (row, i) =>
        `[${i + 1}] (${row.topic}) ${row.content}\n    Source: ${row.source_attribution}`
    )
    .join("\n\n");
}

/**
 * Returns formatted tool output for Gemini (cite only facts from this text).
 */
export async function get_curated_pet_guidance(
  breedRaw: string | undefined,
  animalType: string | undefined,
  topic: string | undefined
): Promise<string> {
  const breedKey = normalizeBreedKey(breedRaw ?? null);
  const animal = animalType?.trim() || null;
  const topicTrim = topic?.trim() || null;

  const fromApi = await fetchFromApi(breedKey, animal, topicTrim);
  if (fromApi !== null) return fromApi;

  return await fetchFromDb(breedKey, animal, topicTrim);
}
