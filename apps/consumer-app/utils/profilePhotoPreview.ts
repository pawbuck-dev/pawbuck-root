import { isHttpAvatarUrl } from "@/components/profile/profileUtils";

export type ProfilePhotoPreviewInput = {
  pendingPhotoUri?: string | null;
  storedPhotoPreviewUri?: string | null;
  oauthAvatarUrl?: string | null;
  showOAuthAvatar?: boolean;
};

/** Resolve the photo preview URI for profile edit modal (pending > stored > OAuth). */
export function resolveProfileEditPhotoPreview(input: ProfilePhotoPreviewInput): string | null {
  if (input.pendingPhotoUri) return input.pendingPhotoUri;
  if (input.storedPhotoPreviewUri) return input.storedPhotoPreviewUri;
  if (input.showOAuthAvatar && input.oauthAvatarUrl && isHttpAvatarUrl(input.oauthAvatarUrl)) {
    return input.oauthAvatarUrl;
  }
  return null;
}
