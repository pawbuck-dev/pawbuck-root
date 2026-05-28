/**
 * PawBuck.API Milo health “single event bundle” (documents + journal note).
 */

import type { PetDocumentVaultRowDto } from "./miloDocumentsApi";
import {
  extractApiErrorMessage,
  fetchWithRetry,
  parseApiResponseBody,
} from "./httpErrors";

export type MiloHealthBundleRequest = {
  petId: string;
  textNote?: string;
  documentBucket?: string;
  documentPath?: string;
  documentMimeType?: string;
};

export type MiloHealthBundleResponse = {
  confirmation: string;
  scenario: string;
  routedTo: string[];
  document: PetDocumentVaultRowDto | null;
  journalEntryId: string | null;
};

/** POST /api/milo/health-records/bundle — at least one of text or document path required. */
export async function submitHealthRecordsBundle(
  baseUrl: string,
  accessToken: string,
  body: MiloHealthBundleRequest
): Promise<MiloHealthBundleResponse> {
  const base = baseUrl.replace(/\/$/, "");
  const requestBody = JSON.stringify({
    petId: body.petId,
    textNote: body.textNote?.trim() || undefined,
    documentBucket: body.documentBucket ?? "pets",
    documentPath: body.documentPath?.trim() || undefined,
    documentMimeType: body.documentMimeType,
  });

  const res = await fetchWithRetry(() =>
    fetch(`${base}/api/milo/health-records/bundle`, {
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

  return parsed as unknown as MiloHealthBundleResponse;
}
