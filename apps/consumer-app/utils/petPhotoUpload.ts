import { clearUrlCache, uploadFile } from "@/utils/image";
import type { ImagePickerAsset } from "expo-image-picker";

const LOCAL_PHOTO_URI_PREFIXES = [
  "file://",
  "ph://",
  "content://",
  "assets-library://",
];

/** True when onboarding picked a device photo that still needs upload to the pets bucket. */
export function isLocalPhotoUri(uri: string | null | undefined): boolean {
  const trimmed = uri?.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  return LOCAL_PHOTO_URI_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function inferMimeType(uri: string): string {
  const ext = uri.split(".").pop()?.split("?")[0]?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
}

function buildPetProfilePhotoPath(
  userId: string,
  petName: string,
  petId: string,
  uri: string,
): string {
  const fileExtension = uri.split(".").pop()?.split("?")[0] || "jpg";
  const safeName = petName.trim().split(/\s+/).join("_") || "pet";
  return `${userId}/pet_${safeName}_${petId}/profile.${fileExtension}`;
}

/** Upload onboarding/local picker URI and return the storage path for `pets.photo_url`. */
export async function uploadPetProfilePhotoFromUri(
  localUri: string,
  userId: string,
  petId: string,
  petName: string,
): Promise<string> {
  const filePath = buildPetProfilePhotoPath(userId, petName, petId, localUri);
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
