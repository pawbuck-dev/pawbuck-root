/**
 * Bridge from Supabase Edge to PawBuck.API (Milo vault + curated guidance).
 * Set PAWBUCK_API_URL and MILO_INTERNAL_SERVICE_KEY on Edge functions.
 */
export const MILO_INTERNAL_HEADER = "X-Pawbuck-Milo-Internal-Key";

export function getPawbuckApiBaseUrl(): string | null {
  const u = Deno.env.get("PAWBUCK_API_URL")?.trim();
  return u ? u.replace(/\/$/, "") : null;
}

export function getMiloInternalServiceKey(): string | null {
  return Deno.env.get("MILO_INTERNAL_SERVICE_KEY")?.trim() ?? null;
}

export type AnalyzePetDocumentInternalBody = {
  petId: string;
  userId: string;
  bucket: string;
  path: string;
  mimeType?: string;
  documentId?: string;
  documentTypeOverride?: string;
  ingestionSource?: string;
};

export type PetDocumentVaultRow = {
  id: string;
  petId: string;
  userId: string;
  storagePath: string;
  mimeType: string;
  documentType: string;
  confidence: number;
};

export async function analyzePetDocumentInternal(
  body: AnalyzePetDocumentInternalBody,
): Promise<{ ok: true; row: PetDocumentVaultRow } | { ok: false; status: number; error: string }> {
  const base = getPawbuckApiBaseUrl();
  const key = getMiloInternalServiceKey();
  if (!base || !key) {
    return {
      ok: false,
      status: 503,
      error: "PAWBUCK_API_URL or MILO_INTERNAL_SERVICE_KEY not configured",
    };
  }

  const url = `${base}/api/milo/documents/analyze-internal`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [MILO_INTERNAL_HEADER]: key,
    },
    body: JSON.stringify({
      petId: body.petId,
      userId: body.userId,
      bucket: body.bucket,
      path: body.path,
      mimeType: body.mimeType,
      documentId: body.documentId,
      documentTypeOverride: body.documentTypeOverride,
      ingestionSource: body.ingestionSource,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: text || `analyze-internal HTTP ${response.status}`,
    };
  }

  try {
    const raw = JSON.parse(text) as Record<string, unknown>;
    const row: PetDocumentVaultRow = {
      id: String(raw.id ?? ""),
      petId: String(raw.petId ?? raw.pet_id ?? body.petId),
      userId: String(raw.userId ?? raw.user_id ?? body.userId),
      storagePath: String(raw.storagePath ?? raw.storage_path ?? body.path),
      mimeType: String(raw.mimeType ?? raw.mime_type ?? body.mimeType ?? ""),
      documentType: String(raw.documentType ?? raw.document_type ?? ""),
      confidence: Number(raw.confidence ?? 0),
    };
    return { ok: true, row };
  } catch {
    return { ok: false, status: 502, error: `Invalid analyze-internal JSON: ${text.slice(0, 500)}` };
  }
}
