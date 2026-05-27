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

const RETRYABLE_HTTP_STATUSES = new Set([502, 503, 504]);
const ANALYZE_INTERNAL_MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Normalize API/ALB error bodies so failure_reason stays readable in admin metrics. */
export function normalizeAnalyzeInternalError(status: number, rawText: string): string {
  const trimmed = rawText.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { error?: string; message?: string };
      const msg = parsed.error?.trim() || parsed.message?.trim();
      if (msg) return msg;
    } catch {
      // fall through
    }
  }

  if (
    /<html/i.test(trimmed) &&
    (/504|gateway time-out|gateway timeout/i.test(trimmed))
  ) {
    return `Gateway timeout (${status}) calling analyze-internal — check API/ALB timeout and retry.`;
  }

  if (trimmed.length > 320) {
    return `${trimmed.slice(0, 320)}…`;
  }

  return trimmed || `analyze-internal HTTP ${status}`;
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
  const requestBody = JSON.stringify({
    petId: body.petId,
    userId: body.userId,
    bucket: body.bucket,
    path: body.path,
    mimeType: body.mimeType,
    documentId: body.documentId,
    documentTypeOverride: body.documentTypeOverride,
    ingestionSource: body.ingestionSource,
  });

  for (let attempt = 1; attempt <= ANALYZE_INTERNAL_MAX_ATTEMPTS; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [MILO_INTERNAL_HEADER]: key,
      },
      body: requestBody,
    });

    const text = await response.text();
    if (response.ok) {
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
        return {
          ok: false,
          status: 502,
          error: normalizeAnalyzeInternalError(502, `Invalid analyze-internal JSON: ${text.slice(0, 500)}`),
        };
      }
    }

    if (RETRYABLE_HTTP_STATUSES.has(response.status) && attempt < ANALYZE_INTERNAL_MAX_ATTEMPTS) {
      const delayMs = 1000 * attempt;
      console.warn(
        `[analyze-internal] HTTP ${response.status} attempt ${attempt}/${ANALYZE_INTERNAL_MAX_ATTEMPTS}; retry in ${delayMs}ms`,
      );
      await sleep(delayMs);
      continue;
    }

    return {
      ok: false,
      status: response.status,
      error: normalizeAnalyzeInternalError(response.status, text),
    };
  }

  return {
    ok: false,
    status: 503,
    error: "analyze-internal failed after retries",
  };
}
