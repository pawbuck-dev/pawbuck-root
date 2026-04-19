import { DocumentPickerAsset } from "expo-document-picker";
import { ImagePickerAsset } from "expo-image-picker";
import { supabase } from "./supabase";

type CachedUrl = {
  url: string;
  expiresAt: number;
};

const urlCache = new Map<string, CachedUrl>();

/** Supabase Storage returns 404 when the object was deleted or the DB path is stale. */
function isStorageObjectMissing(error: unknown): boolean {
  if (error == null) return false;
  const e = error as {
    statusCode?: string | number;
    message?: string;
    name?: string;
  };
  if (e.statusCode === "404" || e.statusCode === 404) return true;
  const msg = String(e.message ?? "").toLowerCase();
  if (msg.includes("not found") || msg.includes("object not found")) return true;
  return false;
}

/**
 * Returns a short-lived signed URL for `pets` bucket path, or `null` if the object does not exist
 * or signing fails (stale `photo_url` / `document_url` rows are common after deletes or env switches).
 */
export const getPrivateImageUrl = async (
  imagePath: string,
  expiresIn = 3600
): Promise<string | null> => {
  const trimmed = imagePath?.trim();
  if (!trimmed) return null;

  try {
    const { data, error } = await supabase.storage
      .from("pets")
      .createSignedUrl(trimmed, expiresIn);

    if (error) {
      if (isStorageObjectMissing(error)) {
        if (__DEV__) {
          console.debug("[storage] Signed URL skipped (missing object):", trimmed);
        }
        return null;
      }
      console.warn("[storage] createSignedUrl:", error.message ?? error);
      return null;
    }

    return data?.signedUrl ?? null;
  } catch (error) {
    if (isStorageObjectMissing(error)) {
      return null;
    }
    console.warn("[storage] createSignedUrl failed:", error);
    return null;
  }
};

export const getCachedSignedUrl = async (
  imagePath: string,
  expiresIn = 3600
): Promise<string | null> => {
  const now = Date.now();
  const cached = urlCache.get(imagePath);

  // Return cached URL if still valid (with 5 min buffer)
  if (cached && cached.expiresAt - now > 300000) {
    return cached.url;
  }

  const url = await getPrivateImageUrl(imagePath, expiresIn);
  if (!url) {
    urlCache.delete(imagePath);
    return null;
  }

  urlCache.set(imagePath, {
    url,
    expiresAt: now + expiresIn * 1000,
  });

  return url;
};

// Clear cached URL for a specific image path
export const clearUrlCache = (imagePath?: string) => {
  if (imagePath) {
    urlCache.delete(imagePath);
  } else {
    urlCache.clear();
  }
};

// Upload file using standard upload
export async function uploadFile(
  file: ImagePickerAsset | DocumentPickerAsset,
  path: string
) {
  try {
    // Fetch the file as arrayBuffer (works in React Native with polyfills)
    const response = await fetch(file.uri);
    const arrayBuffer = await response.arrayBuffer();

    const { data, error } = await supabase.storage
      .from("pets")
      .upload(path, arrayBuffer, {
        contentType: file.mimeType || "image/jpeg",
        upsert: true,
      });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}

export const deleteFile = async (path: string) => {
  try {
    const { error } = await supabase.storage.from("pets").remove([path]);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Delete error:", error);
    throw error;
  }
};
