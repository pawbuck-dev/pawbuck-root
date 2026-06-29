import { CARE_NUDGE_CATALOG } from "./catalog";
import { vaccinationsRoute } from "./dateUtils";
import type { CareNudge, MissingRequiredInput } from "./types";

export function buildMissingRequiredNudges(input: {
  petId: string;
  petName?: string;
  missingRequired: MissingRequiredInput[];
}): CareNudge[] {
  const catalog = CARE_NUDGE_CATALOG.vac_missing_required;
  return input.missingRequired.map((req) => ({
    kind: "vac_missing_required",
    dedupeKey: `vac-missing:${input.petId}:${req.canonicalKey}`,
    petId: input.petId,
    petName: input.petName,
    priority: catalog.priority,
    title: `${req.vaccineName} not on file`,
    body: "This core vaccine is missing from your pet's records. Add a certificate or ask your vet.",
    deepLink: vaccinationsRoute(input.petId),
    channels: catalog.channels,
  }));
}
