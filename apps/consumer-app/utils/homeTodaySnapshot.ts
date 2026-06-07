import type { Tables } from "@/database.types";
import type { MedicineData } from "@/types/medication";
import { getNextMedicationDose } from "@/utils/medication";
import type { BriefingCategorySignal } from "@/utils/healthBriefingUi";
import { getVaccinationAlertPeriod } from "@/utils/vaccinationAlertPeriods";
import moment from "moment";

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
  vaccinations: Pick<Tables<"vaccinations">, "id" | "name" | "next_due_date">[];
  medicines: MedicineData[];
  petCountry?: string | null;
}): HomeTodayPriority | null {
  const { petId, vaccinations, medicines, petCountry } = input;
  const now = moment();

  const upcomingVaccination = vaccinations
    .filter((vac) => {
      if (!vac.next_due_date) return false;
      const dueDate = moment(vac.next_due_date);
      const alertPeriodMonths = getVaccinationAlertPeriod(vac.name, petCountry);
      const alertPeriodDays = alertPeriodMonths * 30;
      return dueDate.isAfter(now) && dueDate.diff(now, "days") <= alertPeriodDays;
    })
    .sort((a, b) => moment(a.next_due_date!).diff(moment(b.next_due_date!)))[0];

  if (upcomingVaccination?.next_due_date) {
    const daysLeft = moment(upcomingVaccination.next_due_date).diff(now, "days");
    return {
      id: `vac-${upcomingVaccination.id}`,
      title: `${upcomingVaccination.name} due`,
      subtitle:
        daysLeft <= 7
          ? `Due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} — see vet briefing below`
          : `Due in ${daysLeft} days — see vet briefing below`,
      route: `/(home)/health-record/${petId}/(tabs)/vaccinations`,
    };
  }

  const dueMedication = medicines.find((med) => {
    const nextDose = getNextMedicationDose(med);
    return nextDose && moment(nextDose).isSame(now, "day");
  });

  if (dueMedication) {
    return {
      id: `med-${dueMedication.id}`,
      title: `${dueMedication.name} due today`,
      subtitle: "Review medication schedule in health records",
      route: `/(home)/health-record/${petId}/(tabs)/medications`,
    };
  }

  return null;
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
