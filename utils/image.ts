import { DocumentPickerAsset } from "expo-document-picker";
import { ImagePickerAsset } from "expo-image-picker";
import { supabase } from "./supabase";

type CachedUrl = {
  url: string;
  expiresAt: number;
};

const urlCache = new Map<string, CachedUrl>();

export const getPrivateImageUrl = async (
  imagePath: string,
  expiresIn = 3600
) => {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6159b4ab-31b3-4ac9-9974-35393e1704ad',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'image.ts:17',message:'Before createSignedUrl',data:{imagePath,expiresIn},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const { data, error } = await supabase.storage
      .from("pets")
      .createSignedUrl(imagePath, expiresIn); // URL valid for 1 hour

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6159b4ab-31b3-4ac9-9974-35393e1704ad',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'image.ts:23',message:'After createSignedUrl',data:{hasError:!!error,errorMessage:error?.message,errorStatus:error?.status,hasData:!!data,hasSignedUrl:!!data?.signedUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6159b4ab-31b3-4ac9-9974-35393e1704ad',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'image.ts:28',message:'Error creating signed URL',data:{errorName:error?.constructor?.name,errorMessage:error?.message,errorStatus:error?.status,imagePath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Error getting signed URL:", error);
    throw error;
  }
};

export const getCachedSignedUrl = async (
  imagePath: string,
  expiresIn = 3600
) => {
  const now = Date.now();
  const cached = urlCache.get(imagePath);

  // Return cached URL if still valid (with 5 min buffer)
  if (cached && cached.expiresAt - now > 300000) {
    return cached.url;
  }

  // Generate new signed URL
  const url = await getPrivateImageUrl(imagePath, expiresIn);
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
