import { CARE_NUDGE_CATALOG } from "./catalog";
import {
  daysBetweenLocal,
  formatDaysLeftLabel,
  parseDateOnlyYmd,
  startOfLocalDay,
  vaccinationsRoute,
} from "./dateUtils";
import type { CareNudge, VaccinationNudgeInput } from "./types";
import { getVaccinationAlertPeriodMonths } from "./vaccinationAlertPeriods";
import { latestVaccinationIdSet } from "./vaccinationGrouping";

export function buildVaccinationNudges(input: {
  petId: string;
  petName?: string;
  petCountry?: string | null;
  vaccinations: VaccinationNudgeInput[];
  now?: Date;
}): CareNudge[] {
  const now = input.now ?? new Date();
  const today = startOfLocalDay(now);
  const latestIds = latestVaccinationIdSet(input.vaccinations);
  const nudges: CareNudge[] = [];

  for (const vac of input.vaccinations) {
    if (!vac.next_due_date || !latestIds.has(vac.id)) continue;

    const due = startOfLocalDay(parseDateOnlyYmd(vac.next_due_date));
    const daysLeft = daysBetweenLocal(today, due);
    const catalogOverdue = CARE_NUDGE_CATALOG.vac_overdue;
    const catalogDueSoon = CARE_NUDGE_CATALOG.vac_due_soon;

    if (daysLeft < 0) {
      const overdueDays = Math.abs(daysLeft);
      nudges.push({
        kind: "vac_overdue",
        dedupeKey: `vac-overdue:${input.petId}:${vac.id}`,
        petId: input.petId,
        petName: input.petName,
        priority: catalogOverdue.priority,
        title: `${vac.name} overdue`,
        body:
          overdueDays === 1
            ? "Overdue by 1 day — schedule with your veterinarian."
            : `Overdue by ${overdueDays} days — schedule with your veterinarian.`,
        deepLink: vaccinationsRoute(input.petId),
        evidence: { table: "vaccinations", id: vac.id },
        validUntil: vac.next_due_date,
        channels: catalogOverdue.channels,
      });
      continue;
    }

    const alertMonths = getVaccinationAlertPeriodMonths(vac.name, input.petCountry);
    const alertDays = alertMonths * 30;
    if (daysLeft > alertDays) continue;

    nudges.push({
      kind: "vac_due_soon",
      dedupeKey: `vac-due-soon:${input.petId}:${vac.id}`,
      petId: input.petId,
      petName: input.petName,
      priority: catalogDueSoon.priority,
      title: `${vac.name} due`,
      body:
        daysLeft <= 7
          ? `${formatDaysLeftLabel(daysLeft)}. Schedule with your vet.`
          : `${formatDaysLeftLabel(daysLeft)}. Tap to view details.`,
      deepLink: vaccinationsRoute(input.petId),
      evidence: { table: "vaccinations", id: vac.id },
      validUntil: vac.next_due_date,
      channels: catalogDueSoon.channels,
    });
  }

  return nudges;
}
