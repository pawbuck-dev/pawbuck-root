import { clearUrlCache, uploadFile } from "@/utils/image";
import type { ImagePickerAsset } from "expo-image-picker";

function inferMimeType(uri: string): string {
  const ext = uri.split(".").pop()?.split("?")[0]?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
}

/** Storage path under pets bucket for the signed-in owner's profile photo. */
export function buildOwnerProfilePhotoPath(userId: string, uri: string): string {
  const fileExtension = uri.split(".").pop()?.split("?")[0] || "jpg";
  return `${userId}/owner_profile/avatar.${fileExtension}`;
}

export async function uploadOwnerProfilePhotoFromUri(
  localUri: string,
  userId: string
): Promise<string> {
  const filePath = buildOwnerProfilePhotoPath(userId, localUri);
  const asset: ImagePickerAsset = {
    uri: localUri,
    width: 0,
    height: 0,
    mimeType: inferMimeType(localUri),
  };
  const data = await uploadFile(asset, filePath);
  clearUrlCache(data.path);
  return data.path;
}
