import type { Tables } from "@/database.types";
import type { MedicineData } from "@/types/medication";
import { buildPetCareNudges } from "@/services/careNudges/fromPetRecords";
import type { BriefingCategorySignal } from "@/utils/healthBriefingUi";

export type HomeTodayPriority = {
  id: string;
  title: string;
  subtitle: string;
  route: string;
};

export type HomeTodaySnapshot = {
  statusLabel: string;
  statusTone: "ok" | "attention";
  attentionCount: number;
  priority: HomeTodayPriority | null;
};

export function buildTopCatchUpPriority(input: {
  petId: string;
  vaccinations: Pick<Tables<"vaccinations">, "id" | "name" | "date" | "next_due_date">[];
  medicines: MedicineData[];
  petCountry?: string | null;
}): HomeTodayPriority | null {
  const { petId } = input;
  const nudges = buildPetCareNudges(input);
  const top =
    nudges.find((n) => n.kind === "vac_overdue") ??
    nudges.find((n) => n.kind === "vac_due_soon") ??
    nudges.find((n) => n.kind === "med_due_today");

  if (!top) return null;

  const subtitle =
    top.kind === "vac_overdue"
      ? `${top.body} — see vet briefing below`
      : top.kind === "vac_due_soon"
        ? `${top.body.replace(/\.$/, "")} — see vet briefing below`
        : "Review medication schedule in health records";

  return {
    id: top.dedupeKey,
    title: top.title,
    subtitle,
    route: top.deepLink,
  };
}

export function buildHomeTodaySnapshot(input: {
  petId: string;
  vaccinations: Pick<Tables<"vaccinations">, "id" | "name" | "next_due_date">[];
  medicines: MedicineData[];
  petCountry?: string | null;
  vetFlaggedCount: number;
  categories: BriefingCategorySignal[] | null;
}): HomeTodaySnapshot {
  const categoryAttention = (input.categories ?? []).filter((c) => !c.ok).length;
  const attentionCount = input.vetFlaggedCount + categoryAttention;
  const priority = buildTopCatchUpPriority(input);

  if (attentionCount === 0 && !priority) {
    return {
      statusLabel: "All clear today — add a note anytime",
      statusTone: "ok",
      attentionCount: 0,
      priority: null,
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
  };
}
