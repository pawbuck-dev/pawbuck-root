import type { SupportProcessedEmailDetail } from "@/types/support";

export type CaseBannerTone = "danger" | "warning" | "success" | "neutral";

export type CasePrimaryAction =
  | "try_again"
  | "release_lock"
  | "verify_pet_profile"
  | "ask_resend"
  | "none";

export type CaseFileUi = {
  bannerTone: CaseBannerTone;
  bannerTitle: string;
  bannerDetail: string;
  primaryAction: CasePrimaryAction;
  primaryLabel: string;
  primaryDisabled: boolean;
  primaryDisabledReason?: string;
  showClearError: boolean;
  showHideFromOwner: boolean;
  showRemoveFalseRow: boolean;
  emailCopyLabel: string;
  emailCopyDetail: string | null;
};

function isLikelyGhostSuccess(detail: SupportProcessedEmailDetail): boolean {
  if (detail.success !== true) return false;
  if (detail.reviewStatus !== "resolved") return false;
  if (detail.documentType?.trim()) return false;
  return detail.attachmentCount == null || detail.attachmentCount === 0;
}

function emailCopyLabel(status: string | null | undefined): string {
  switch (status) {
    case "stored":
      return "On file — can retry";
    case "not_retained":
      return "Not kept (successful run)";
    case "metadata_only":
      return "Metadata only — PDF bytes missing";
    case "missing":
    case "invalid_json":
      return "Not on file";
    case "storage_not_configured":
      return "Unknown — API storage not configured";
    default:
      return status ?? "Unknown";
  }
}

export function buildCaseFileUi(detail: SupportProcessedEmailDetail): CaseFileUi {
  const ghost = isLikelyGhostSuccess(detail);
  const archive = detail.storedArchiveStatus ?? "";
  const ownerSees = detail.consumerInboxVisible === true;
  const cleared =
    detail.reviewStatus === "resolved" || detail.reviewStatus === "dismissed";

  if (detail.status === "processing") {
    return {
      bannerTone: "warning",
      bannerTitle: "Stuck processing lock",
      bannerDetail:
        "The pipeline never finished. Owner Confirm may return 502/409 until you release the lock.",
      primaryAction: "release_lock",
      primaryLabel: "Release lock",
      primaryDisabled: false,
      showClearError: false,
      showHideFromOwner: false,
      showRemoveFalseRow: false,
      emailCopyLabel: emailCopyLabel(archive),
      emailCopyDetail: detail.storedArchiveMessage ?? null,
    };
  }

  if (ownerSees && archive === "stored") {
    return {
      bannerTone: "danger",
      bannerTitle: "Owner still sees this in Processing errors",
      bannerDetail:
        detail.recommendedAction ??
        "Extract health records from the stored email copy (same as owner Confirm).",
      primaryAction: "try_again",
      primaryLabel: "Try again",
      primaryDisabled: false,
      showClearError: detail.canOwnerResolve === true,
      showHideFromOwner: true,
      showRemoveFalseRow: false,
      emailCopyLabel: emailCopyLabel(archive),
      emailCopyDetail: detail.storedArchiveMessage ?? null,
    };
  }

  if (ownerSees) {
    return {
      bannerTone: "danger",
      bannerTitle: "Owner still sees this error",
      bannerDetail:
        detail.recommendedAction ??
        "Email copy was not saved — ask the owner to forward the message again.",
      primaryAction: "ask_resend",
      primaryLabel: "Copy re-send instructions",
      primaryDisabled: false,
      showClearError: detail.canOwnerResolve === true,
      showHideFromOwner: true,
      showRemoveFalseRow: false,
      emailCopyLabel: emailCopyLabel(archive),
      emailCopyDetail: detail.storedArchiveMessage ?? null,
    };
  }

  if (ghost) {
    return {
      bannerTone: "warning",
      bannerTitle: "Marked complete but no records filed",
      bannerDetail:
        detail.recommendedAction ??
        "Verify the pet profile, then ask the owner to re-send or add records manually.",
      primaryAction: "verify_pet_profile",
      primaryLabel: "Verify pet profile",
      primaryDisabled: !detail.petId,
      primaryDisabledReason: !detail.petId ? "No pet linked to this email" : undefined,
      showClearError: false,
      showHideFromOwner: false,
      showRemoveFalseRow: true,
      emailCopyLabel: emailCopyLabel(archive),
      emailCopyDetail: detail.storedArchiveMessage ?? null,
    };
  }

  if (cleared || archive === "not_retained") {
    return {
      bannerTone: "success",
      bannerTitle: "Cleared from owner inbox",
      bannerDetail:
        detail.recommendedAction ??
        "Verify health records on the pet profile. Re-send email only if records are missing.",
      primaryAction: "verify_pet_profile",
      primaryLabel: "Verify pet profile",
      primaryDisabled: !detail.petId,
      primaryDisabledReason: !detail.petId ? "No pet linked to this email" : undefined,
      showClearError: false,
      showHideFromOwner: false,
      showRemoveFalseRow: false,
      emailCopyLabel: emailCopyLabel(archive),
      emailCopyDetail: detail.storedArchiveMessage ?? null,
    };
  }

  return {
    bannerTone: "neutral",
    bannerTitle: "Review this email",
    bannerDetail: detail.recommendedAction ?? "Inspect details and choose an action below.",
    primaryAction: archive === "stored" ? "try_again" : "verify_pet_profile",
    primaryLabel: archive === "stored" ? "Try again" : "Verify pet profile",
    primaryDisabled: archive === "stored" ? false : !detail.petId,
    showClearError: detail.canOwnerResolve === true,
    showHideFromOwner: true,
    showRemoveFalseRow: ghost,
    emailCopyLabel: emailCopyLabel(archive),
    emailCopyDetail: detail.storedArchiveMessage ?? null,
  };
}

export const RESEND_INSTRUCTIONS = `Please forward the original vet email (with PDF attachments) to your pet's PawBuck inbox again. If it still fails, contact support@pawbuck.com with the date you sent it.`;
