import { isRlsAccessDeniedError, isSessionExpiredLikeError } from "@/utils/supabaseAuthErrors";

export type ClinicalMutationErrorPresentation = {
  title: string;
  message: string;
  isDuplicate: boolean;
  isSessionExpired: boolean;
};

export function formatClinicalMutationError(err: unknown): ClinicalMutationErrorPresentation {
  const message = err instanceof Error ? err.message : String(err);

  if (message.startsWith("DUPLICATE_VACCINATION:")) {
    return {
      title: "Duplicate vaccination",
      message: "This vaccination record already exists for this pet.",
      isDuplicate: true,
      isSessionExpired: false,
    };
  }

  if (message.startsWith("DUPLICATE_MEDICATION:")) {
    return {
      title: "Duplicate medication",
      message: "This medication record already exists for this pet.",
      isDuplicate: true,
      isSessionExpired: false,
    };
  }

  if (isSessionExpiredLikeError(err)) {
    return {
      title: "Session expired",
      message: "Please sign in again to continue.",
      isDuplicate: false,
      isSessionExpired: true,
    };
  }

  if (isRlsAccessDeniedError(err)) {
    return {
      title: "Access denied",
      message: "You do not have permission to change this pet's records.",
      isDuplicate: false,
      isSessionExpired: false,
    };
  }

  return {
    title: "Something went wrong",
    message: message || "Please try again.",
    isDuplicate: false,
    isSessionExpired: false,
  };
}
