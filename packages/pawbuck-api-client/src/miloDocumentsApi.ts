/**
 * PawBuck.API Milo document vault (pet_documents).
 */

import {
  extractApiErrorMessage,
  fetchWithRetry,
  parseApiResponseBody,
} from "./httpErrors";

export type AnalyzePetDocumentRequest = {
  petId: string;
  bucket?: string;
  path: string;
  mimeType?: string;
};

export type PetDocumentClinicalSyncResultDto = {
  synced?: boolean;
  vaccinationsCreated?: number;
  medicationsCreated?: number;
  clinicalExamsCreated?: number;
  labResultsCreated?: number;
  skippedDuplicates?: number;
  clinicalRowsCreated?: number;
  error?: string | null;
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
  clinicalSync?: PetDocumentClinicalSyncResultDto | null;
};

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
  const requestBody = JSON.stringify({
    petId: body.petId,
    bucket: body.bucket ?? "pets",
    path: body.path,
    mimeType: body.mimeType,
  });

  const res = await fetchWithRetry(() =>
    fetch(`${base}/api/milo/documents/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: requestBody,
    })
  );

  const text = await res.text();
  const parsed = parseApiResponseBody(res.status, text);
  if (!res.ok) {
    throw new Error(extractApiErrorMessage(res.status, parsed, text));
  }

  return parsed as unknown as PetDocumentVaultRowDto;
}
