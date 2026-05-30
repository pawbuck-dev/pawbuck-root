import type { HealthExportBundle } from "@/services/healthExportBundle";
import { formatAgeCompact, formatExportDate, formatWeightDisplay } from "@/utils/healthExportFormatters";
import { formatPetWeightForDisplay } from "@/utils/weightUnits";
import { latestVaccinationIdSet } from "@/utils/vaccinationGrouping";
import { journalEntryNeedsTriageAttention } from "@/utils/journalTriage";
import moment from "moment";

export type ClinicalSummaryResult = {
  narrative: string;
  /** Omit in PDF when null (no API confidence yet). */
  confidencePercent: number | null;
};

/**
 * Deterministic clinical summary from export bundle (Milo API can replace later).
 */
export function buildDeterministicClinicalSummary(bundle: HealthExportBundle): ClinicalSummaryResult {
  const { pet } = bundle;
  const age = formatAgeCompact(pet.date_of_birth);
  const sex = (pet.sex ?? "").toLowerCase().includes("female") ? "FS" : "MN";
  const weight = formatPetWeightForDisplay(pet.weight_value, pet.weight_unit) ?? formatWeightDisplay(pet.weight_value, pet.weight_unit);

  const activeConditions = bundle.conditions.filter((c) => c.status === "active");
  const allergyLabels = bundle.allergies.map((a) => a.label);
  const latestVacIds = latestVaccinationIdSet(bundle.vaccinations);
  const overdue = bundle.vaccinations.filter(
    (v) =>
      latestVacIds.has(v.id) &&
      v.next_due_date &&
      moment(v.next_due_date).startOf("day").isBefore(moment().startOf("day"))
  );

  const flagged = bundle.journal.filter((j) => journalEntryNeedsTriageAttention(j)).slice(0, 3);
  const lastExam = bundle.exams[0];

  const parts: string[] = [];
  parts.push(
    `${pet.name}: ${age} ${sex} ${pet.breed}, otherwise healthy on record. Weight ${weight}.`
  );

  if (activeConditions.length > 0) {
    parts.push(`Active conditions: ${activeConditions.map((c) => c.name).join(", ")}.`);
  }
  if (allergyLabels.length > 0) {
    parts.push(`Allergies: ${allergyLabels.join(", ")}.`);
  }
  if (bundle.medicines.length > 0) {
    const names = bundle.medicines.slice(0, 3).map((m) => m.name).join(", ");
    parts.push(`${bundle.medicines.length} active medication(s)${names ? ` (${names})` : ""}.`);
  }
  if (overdue.length > 0) {
    parts.push(`Overdue vaccines: ${overdue.map((v) => v.name).join(", ")}.`);
  } else if (latestVacIds.size > 0) {
    parts.push("Vaccines current on file.");
  }
  if (lastExam) {
    parts.push(
      `Last exam ${formatExportDate(lastExam.exam_date)}${lastExam.clinic_name ? ` at ${lastExam.clinic_name}` : ""}.`
    );
  }
  if (flagged.length > 0) {
    const line = flagged[0].note?.trim() || flagged[0].subtype || "Journal entry flagged for vet";
    parts.push(`Recent concern (${flagged[0].entry_date}): ${line.slice(0, 200)}.`);
  }

  parts.push("This summary is generated from PawBuck records; verify before clinical decisions.");

  return {
    narrative: parts.join(" "),
    confidencePercent: null,
  };
}
