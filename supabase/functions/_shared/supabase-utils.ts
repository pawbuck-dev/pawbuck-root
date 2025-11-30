import { createClient } from "jsr:@supabase/supabase-js@2";

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
 * Get a signed URL for an image stored in Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @param expiresIn - Optional expiration time in seconds (default: 3600 = 1 hour)
 * @returns The signed URL string
 */
export async function getSignedImageUrl(
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
 * Get multiple signed URLs for images stored in Supabase Storage
 * @param bucket - The storage bucket name
 * @param paths - Array of file paths within the bucket
 * @param expiresIn - Optional expiration time in seconds (default: 3600 = 1 hour)
 * @returns Array of signed URL strings
 */
export async function getSignedImageUrls(
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
 * Download an image from Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @returns ArrayBuffer containing the image data
 */
export async function downloadImage(
  bucket: string,
  path: string
): Promise<ArrayBuffer> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) {
    console.error("Error downloading image:", error);
    throw new Error(`Failed to download image: ${error.message}`);
  }

  if (!data) {
    throw new Error("No data returned from download");
  }

  return await data.arrayBuffer();
}

/**
 * Get a public URL for an image (for public buckets only)
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @returns The public URL string
 */
export function getPublicImageUrl(bucket: string, path: string): string {
  const supabase = createSupabaseClient();

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Convert ArrayBuffer to Base64 string
 * @param buffer - The ArrayBuffer to convert
 * @returns Base64 encoded string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Get image as base64 data URL for use with Vision/Gemini APIs
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @param mimeType - The image MIME type (default: 'image/jpeg')
 * @returns Base64 data URL string
 */
export async function getImageAsBase64DataUrl(
  bucket: string,
  path: string,
  mimeType: string = "image/jpeg"
): Promise<string> {
  const imageData = await downloadImage(bucket, path);
  const base64 = arrayBufferToBase64(imageData);
  return `data:${mimeType};base64,${base64}`;
}
