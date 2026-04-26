/** Pure helpers for pet activity push prefs (shared with tests). */

export type PetCareNotificationScope =
  | "all"
  | "meds_only"
  | "journal_only"
  | "none";

export const LIFECYCLE_ACTIVITY_KINDS = [
  "invite_accepted",
  "role_changed",
  "access_revoked",
  "grant_added",
] as const;

export function isLifecycleActivityKind(kind: string): boolean {
  return (LIFECYCLE_ACTIVITY_KINDS as readonly string[]).includes(kind);
}

export function careActivityKindMatchesScope(
  kind: string,
  scope: PetCareNotificationScope
): boolean {
  if (scope === "none") return false;
  if (scope === "all") return true;
  if (scope === "meds_only") {
    return kind.startsWith("med_");
  }
  if (scope === "journal_only") {
    return kind.startsWith("journal_");
  }
  return false;
}

export function shouldSendPetActivityPush(args: {
  kind: string;
  careActivityScope: PetCareNotificationScope;
  carePushEnabled: boolean;
  lifecyclePushEnabled: boolean;
}): boolean {
  const {
    kind,
    careActivityScope,
    carePushEnabled,
    lifecyclePushEnabled,
  } = args;

  if (isLifecycleActivityKind(kind)) {
    return lifecyclePushEnabled;
  }

  if (!carePushEnabled) {
    return false;
  }

  return careActivityKindMatchesScope(kind, careActivityScope);
}
