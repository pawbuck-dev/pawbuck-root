/** User-facing copy for pet @pawbuck.app email allowlist (internal: safe senders / whitelist). */

export const FAMILY_SHARING_TITLE = "Family Sharing";

export const APPROVED_PET_EMAIL_UI = {
  sectionTitle: "Trusted Contacts",
  /** Subtitle under section heading */
  sectionSubtitle: (_count: number) =>
    "People you trust to communicate and share records.",
  emptyBody:
    "Add a clinic or personal email so records sent to your pet's PawBuck address are accepted automatically.",
  emptyTitle: "No trusted contacts yet",
  addButton: "Add email",
  composeSectionHeader: "Trusted Contacts",
  markApprovedAction: "Always allow this email",
  removeConfirmTitle: "Remove contact",
  removeConfirmBody: (email: string) =>
    `Remove "${email}" from trusted contacts? Future messages from this address may need your review.`,
  duplicateError: "This email is already in your trusted contacts",
  addError: "Could not add this email",
  removeError: "Could not remove this email",
  noPetsError: "Add a pet before adding trusted contacts",
  composeEmptyHint:
    "Add care team members or trusted contacts under Profile → Family Sharing → Manage access.",
} as const;
