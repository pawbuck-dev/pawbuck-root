const DEFAULT_PET_EMAIL_DOMAIN = "pawbuck.app";

/**
 * Inbound Milo / health-record email for a pet (immutable identity per US-PT-015).
 */
export function formatPetInboundEmail(
  emailId: string | null | undefined,
  petName: string,
  domain: string = DEFAULT_PET_EMAIL_DOMAIN
): string {
  const local =
    emailId && emailId.trim().length > 0
      ? emailId.trim().toLowerCase()
      : petName.toLowerCase().replace(/\s+/g, "");
  return `${local}@${domain}`;
}
