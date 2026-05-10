import type { Tables } from "@/database.types";
import type { MedicineData } from "@/types/medication";
import { getNextMedicationDose, isMedicationCompleted } from "@/utils/medication";
import { formatPetWeightForDisplay } from "@/utils/weightUnits";
import moment from "moment";

export type BriefingCategoryKey = "weight" | "allergies" | "vaccines" | "meds";

export type BriefingCategorySignal = {
  key: BriefingCategoryKey;
  /** When true, show green status dot; when false, orange (needs attention / vet talking point). */
  ok: boolean;
};

export function formatHealthBriefingSubtitle(params: {
  petName: string;
  weightValue: number | null | undefined;
  weightUnit: string | null | undefined;
  allergiesCount: number;
  activeConditionsCount: number;
}): string {
  const { petName, weightValue, weightUnit, allergiesCount, activeConditionsCount } = params;
  const parts: string[] = [petName];
  const w = formatPetWeightForDisplay(weightValue, weightUnit);
  if (w) parts.push(w);
  if (allergiesCount > 0) {
    parts.push(`${allergiesCount} ${allergiesCount === 1 ? "allergy" : "allergies"}`);
  }
  if (activeConditionsCount > 0) {
    parts.push(`${activeConditionsCount} ${activeConditionsCount === 1 ? "condition" : "conditions"}`);
  }
  return parts.join(" · ");
}

export function vaccinesStatusOk(vaccinations: Pick<Tables<"vaccinations">, "next_due_date">[]): boolean {
  const today = moment().startOf("day");
  return !vaccinations.some(
    (v) => v.next_due_date && moment(v.next_due_date).startOf("day").isBefore(today)
  );
}

function medNeedsAttention(med: MedicineData): boolean {
  if (isMedicationCompleted(med)) return false;
  const next = getNextMedicationDose(med);
  if (!next) return false;
  return moment(next).startOf("day").isSameOrBefore(moment().startOf("day"));
}

export function medsScheduleStatusOk(medicines: MedicineData[]): boolean {
  return !medicines.some((m) => medNeedsAttention(m));
}

export function computeBriefingCategorySignals(input: {
  weightValue: number | null | undefined;
  allergiesCount: number;
  vaccinations: Pick<Tables<"vaccinations">, "next_due_date">[];
  medicines: MedicineData[];
}): BriefingCategorySignal[] {
  return [
    { key: "weight", ok: input.weightValue != null && input.weightValue > 0 },
    { key: "allergies", ok: input.allergiesCount === 0 },
    { key: "vaccines", ok: vaccinesStatusOk(input.vaccinations) },
    { key: "meds", ok: medsScheduleStatusOk(input.medicines) },
  ];
}
