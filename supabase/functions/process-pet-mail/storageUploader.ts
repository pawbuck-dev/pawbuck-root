import { createClient } from "jsr:@supabase/supabase-js@2";
import type { DocumentType, Pet } from "./types.ts";

/**
 * Creates a Supabase client with service role key
 */
function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Converts base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:[^;]+;base64,/, "");

  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

/**
 * Generates a unique file path for storage
 * Format: {user_id}/{pet_id}/{document_type}/{timestamp}_{filename}
 */
function generateStoragePath(
  pet: Pet,
  documentType: DocumentType,
  filename: string
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");

  return `${pet.user_id}/pet_${pet.name}_${pet.id}/${documentType}/email_${timestamp}_${sanitizedFilename}`;
}

/**
 * Uploads an attachment to Supabase Storage
 * @param pet - Pet record for path generation
 * @param documentType - Type of document for organizing files
 * @param filename - Original filename
 * @param base64Content - Base64 encoded file content
 * @param mimeType - MIME type of the file
 * @returns Storage path of uploaded file
 */
export async function uploadAttachment(
  pet: Pet,
  documentType: DocumentType,
  filename: string,
  base64Content: string,
  mimeType: string
): Promise<string> {
  console.log(`Uploading attachment: ${filename} (type: ${documentType})`);

  const supabase = createSupabaseClient();
  const storagePath = generateStoragePath(pet, documentType, filename);

  // Convert base64 to binary
  const fileData = base64ToUint8Array(base64Content);

  // Upload to pet-documents bucket
  const { data, error } = await supabase.storage
    .from("pets")
    .upload(storagePath, fileData, {
      contentType: mimeType,
      upsert: false, // Don't overwrite existing files
    });

  if (error) {
    console.error("Error uploading to storage:", error);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  console.log(`Successfully uploaded to: ${storagePath}`);
  return data.path;
}

/**
 * Checks if a file exists in storage
 */
export async function fileExists(
  bucket: string,
  path: string
): Promise<boolean> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(path.split("/").slice(0, -1).join("/"), {
      search: path.split("/").pop(),
    });

  if (error) {
    console.error("Error checking file existence:", error);
    return false;
  }

  return data && data.length > 0;
}
