import type { Tables } from "@/database.types";
import type { MedicineData } from "@/types/medication";
import { buildPetCareNudges } from "@/services/careNudges/fromPetRecords";
import { filterNudgesWithDismissals, type CareNudgeDismissalRow } from "@/services/careNudges/dismissals";
import type { RequiredVaccinesStatus } from "@/services/vaccineRequirements";
import type { BriefingCategorySignal } from "@/utils/healthBriefingUi";

export type HomeTodayPriority = {
  id: string;
  title: string;
  subtitle: string;
  route: string;
};

export type HomeCareNudgeItem = {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  route: string;
};

export type HomeTodaySnapshot = {
  statusLabel: string;
  statusTone: "ok" | "attention";
  attentionCount: number;
  priority: HomeTodayPriority | null;
  careNudges: HomeCareNudgeItem[];
};

function mapNudgeToItem(n: ReturnType<typeof buildPetCareNudges>[number]): HomeCareNudgeItem {
  return {
    id: n.dedupeKey,
    kind: n.kind,
    title: n.title,
    subtitle: n.body,
    route: n.deepLink,
  };
}

export function buildTopCareNudges(
  input: {
    petId: string;
    petName?: string;
    petCountry?: string | null;
    vaccinations: Pick<Tables<"vaccinations">, "id" | "name" | "date" | "next_due_date">[];
    medicines: MedicineData[];
    requiredStatus?: RequiredVaccinesStatus | null;
    dismissals?: CareNudgeDismissalRow[];
  },
  limit = 3
): HomeCareNudgeItem[] {
  const raw = buildPetCareNudges(input);
  const filtered = input.dismissals?.length
    ? filterNudgesWithDismissals(raw, input.dismissals)
    : raw;
  return filtered.slice(0, limit).map(mapNudgeToItem);
}

export function buildTopCatchUpPriority(input: {
  petId: string;
  vaccinations: Pick<Tables<"vaccinations">, "id" | "name" | "date" | "next_due_date">[];
  medicines: MedicineData[];
  petCountry?: string | null;
  requiredStatus?: RequiredVaccinesStatus | null;
  dismissals?: CareNudgeDismissalRow[];
}): HomeTodayPriority | null {
  const top = buildTopCareNudges({ ...input }, 1)[0];
  if (!top) return null;

  const subtitle =
    top.kind === "vac_overdue"
      ? `${top.subtitle} — see vet briefing below`
      : top.kind === "vac_due_soon"
        ? `${top.subtitle.replace(/\.$/, "")} — see vet briefing below`
        : top.kind === "vac_missing_required"
          ? `${top.subtitle} — see vet briefing below`
          : "Review medication schedule in health records";

  return {
    id: top.id,
    title: top.title,
    subtitle,
    route: top.route,
  };
}

export function buildHomeTodaySnapshot(input: {
  petId: string;
  petName?: string;
  vaccinations: Pick<Tables<"vaccinations">, "id" | "name" | "date" | "next_due_date">[];
  medicines: MedicineData[];
  petCountry?: string | null;
  requiredStatus?: RequiredVaccinesStatus | null;
  dismissals?: CareNudgeDismissalRow[];
  vetFlaggedCount: number;
  categories: BriefingCategorySignal[] | null;
}): HomeTodaySnapshot {
  const categoryAttention = (input.categories ?? []).filter((c) => !c.ok).length;
  const attentionCount = input.vetFlaggedCount + categoryAttention;
  const careNudges = buildTopCareNudges(input, 3);
  const priority = buildTopCatchUpPriority(input);

  if (attentionCount === 0 && !priority) {
    return {
      statusLabel: "All clear today — add a note anytime",
      statusTone: "ok",
      attentionCount: 0,
      priority: null,
      careNudges,
    };
  }

  return {
    statusLabel:
      attentionCount === 0
        ? "Review your vet briefing below"
        : `${attentionCount} item${attentionCount === 1 ? "" : "s"} in your vet briefing`,
    statusTone: "attention",
    attentionCount: Math.max(attentionCount, priority ? 1 : 0),
    priority,
    careNudges,
  };
}
