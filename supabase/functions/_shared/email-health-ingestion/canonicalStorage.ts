import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  buildCanonicalDocumentStoragePath,
  type CanonicalPet,
} from "./canonicalPaths.ts";

export type { CanonicalPet } from "./canonicalPaths.ts";
export { buildCanonicalDocumentStoragePath, extensionFromFilename } from "./canonicalPaths.ts";

function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const base64Data = base64.replace(/^data:[^;]+;base64,/, "");
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function uploadCanonicalDocument(
  pet: CanonicalPet,
  documentId: string,
  filename: string,
  base64Content: string,
  mimeType: string,
  bucket = "pets",
): Promise<string> {
  const supabase = createSupabaseClient();
  const storagePath = buildCanonicalDocumentStoragePath(pet, documentId, filename);
  const fileData = base64ToUint8Array(base64Content);

  const { data, error } = await supabase.storage.from(bucket).upload(storagePath, fileData, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return data.path;
}
