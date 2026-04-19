/**
 * PawBuck.API Milo document vault (pet_documents).
 */

export type AnalyzePetDocumentRequest = {
  petId: string;
  bucket?: string;
  path: string;
  mimeType?: string;
};

export type PetDocumentVaultRowDto = {
  id: string;
  petId: string;
  userId: string;
  storagePath: string;
  mimeType: string;
  documentType: string;
  confidence: number;
  extractedJson: string;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
};

async function parseJsonOrThrow(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }
}

/**
 * Run Milo vision classify + extract and persist a `pet_documents` row.
 * Requires Supabase JWT (same as Milo chat) for storage download on the API.
 */
export async function analyzePetDocument(
  baseUrl: string,
  accessToken: string,
  body: AnalyzePetDocumentRequest
): Promise<PetDocumentVaultRowDto> {
  const base = baseUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/api/milo/documents/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      petId: body.petId,
      bucket: body.bucket ?? "pets",
      path: body.path,
      mimeType: body.mimeType,
    }),
  });

  const parsed = (await parseJsonOrThrow(res)) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof parsed.error === "string"
        ? parsed.error
        : typeof parsed.message === "string"
          ? parsed.message
          : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return parsed as unknown as PetDocumentVaultRowDto;
}
