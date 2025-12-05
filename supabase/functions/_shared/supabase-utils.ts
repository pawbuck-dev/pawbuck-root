import { encodeBase64 } from "@std/encoding";
import { createClient } from "supabase";

/**
 * Create a Supabase client for use in Deno Edge Functions
 */
export function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Download a file from Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @returns ArrayBuffer containing the file data
 */
export async function downloadFile(
  bucket: string,
  path: string
): Promise<ArrayBuffer> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) {
    console.error("Error downloading file:", error);
    throw new Error(`Failed to download file: ${error.message}`);
  }

  if (!data) {
    throw new Error("No data returned from download");
  }

  return await data.arrayBuffer();
}

/**
 * Get a signed URL for a file stored in Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @param expiresIn - Optional expiration time in seconds (default: 3600 = 1 hour)
 * @returns The signed URL string
 */
export async function getSignedFileUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error("Error creating signed URL:", error);
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  if (!data?.signedUrl) {
    throw new Error("No signed URL returned");
  }

  return data.signedUrl;
}

/**
 * Get multiple signed URLs for files stored in Supabase Storage
 * @param bucket - The storage bucket name
 * @param paths - Array of file paths within the bucket
 * @param expiresIn - Optional expiration time in seconds (default: 3600 = 1 hour)
 * @returns Array of signed URL strings
 */
export async function getSignedFileUrls(
  bucket: string,
  paths: string[],
  expiresIn: number = 3600
): Promise<string[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, expiresIn);

  if (error) {
    console.error("Error creating signed URLs:", error);
    throw new Error(`Failed to create signed URLs: ${error.message}`);
  }

  if (!data) {
    throw new Error("No signed URLs returned");
  }

  return data.map((item) => {
    if (item.error) {
      console.error(`Error for path ${item.path}:`, item.error);
      throw new Error(`Failed to create signed URL for ${item.path}`);
    }
    return item.signedUrl;
  });
}

/**
 * Get a public URL for a file (for public buckets only)
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @returns The public URL string
 */
export function getPublicFileUrl(bucket: string, path: string): string {
  const supabase = createSupabaseClient();

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Convert ArrayBuffer to Base64 string using Deno's standard library
 * This method is more efficient and avoids stack overflow issues with large files
 * @param buffer - The ArrayBuffer to convert
 * @returns Base64 encoded string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  return encodeBase64(uint8Array);
}

/**
 * Download a file from Supabase Storage and convert to base64
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @returns Base64 encoded string
 */
export async function getFileAsBase64(
  bucket: string,
  path: string
): Promise<string> {
  const fileData = await downloadFile(bucket, path);
  return await arrayBufferToBase64(fileData);
}

/**
 * @deprecated Use getFileAsBase64 instead
 */
export const getImageAsBase64 = getFileAsBase64;

/**
 * Get MIME type from file extension
 * @param path - The file path
 * @returns MIME type string
 */
export function getMimeTypeFromPath(path: string): string {
  const extension = path.toLowerCase().split(".").pop();

  const mimeTypes: Record<string, string> = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    ico: "image/x-icon",
    tiff: "image/tiff",
    tif: "image/tiff",
    heic: "image/heic",
    heif: "image/heif",

    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    csv: "text/csv",

    // Other
    json: "application/json",
    xml: "application/xml",
    zip: "application/zip",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
  };

  return mimeTypes[extension || ""] || "application/octet-stream";
}

/**
 * Get file as base64 data URL for use with Vision/AI APIs or embedding in HTML
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @param mimeType - The MIME type (optional, will be auto-detected from file extension if not provided)
 * @returns Base64 data URL string
 */
export async function getFileAsBase64DataUrl(
  bucket: string,
  path: string,
  mimeType?: string
): Promise<string> {
  const base64 = await getFileAsBase64(bucket, path);
  const mime = mimeType || getMimeTypeFromPath(path);
  return `data:${mime};base64,${base64}`;
}
