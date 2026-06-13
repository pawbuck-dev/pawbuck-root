export function mapPetFamilyInviteErrorStatus(errorCode: string): number {
  switch (errorCode) {
    case "unauthenticated":
      return 401;
    case "email_mismatch":
    case "already_owner":
      return 403;
    case "expired":
    case "invalid_token":
    case "not_pending":
      return 400;
    case "member_limit":
      return 409;
    default:
      return 400;
  }
}

export function resolvePetFamilyInviteError(
  result: Record<string, unknown> | null
): { error: string; status: number } {
  const err = typeof result?.error === "string" ? result.error : "rejected";
  return { error: err, status: mapPetFamilyInviteErrorStatus(err) };
}
