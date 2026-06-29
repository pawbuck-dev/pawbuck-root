import { CARE_NUDGE_CATALOG } from "./catalog";
import { medicationsRoute, parseDateOnlyYmd, startOfLocalDay } from "./dateUtils";
import type { CareNudge, MedicationNudgeInput } from "./types";

export function buildMedicationNudges(input: {
  petId: string;
  petName?: string;
  medications: MedicationNudgeInput[];
  now?: Date;
}): CareNudge[] {
  const now = input.now ?? new Date();
  const today = startOfLocalDay(now);
  const catalog = CARE_NUDGE_CATALOG.med_due_today;
  const nudges: CareNudge[] = [];

  for (const med of input.medications) {
    if (!med.nextDoseDateYmd) continue;
    const doseDay = startOfLocalDay(parseDateOnlyYmd(med.nextDoseDateYmd));
    if (doseDay.getTime() !== today.getTime()) continue;

    nudges.push({
      kind: "med_due_today",
      dedupeKey: `med-today:${input.petId}:${med.id}`,
      petId: input.petId,
      petName: input.petName,
      priority: catalog.priority,
      title: `${med.name} due today`,
      body: "Review medication schedule in health records.",
      deepLink: medicationsRoute(input.petId),
      evidence: { table: "medicines", id: med.id },
      channels: catalog.channels,
    });
  }

  return nudges;
}
