/**
 * PawBuck.API Milo health “single event bundle” (documents + journal note).
 */

import type { PetDocumentVaultRowDto } from "./miloDocumentsApi";

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

async function parseJsonOrThrow(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }
}

/** POST /api/milo/health-records/bundle — at least one of text or document path required. */
export async function submitHealthRecordsBundle(
  baseUrl: string,
  accessToken: string,
  body: MiloHealthBundleRequest
): Promise<MiloHealthBundleResponse> {
  const base = baseUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/api/milo/health-records/bundle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      petId: body.petId,
      textNote: body.textNote?.trim() || undefined,
      documentBucket: body.documentBucket ?? "pets",
      documentPath: body.documentPath?.trim() || undefined,
      documentMimeType: body.documentMimeType,
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

  return parsed as unknown as MiloHealthBundleResponse;
}
