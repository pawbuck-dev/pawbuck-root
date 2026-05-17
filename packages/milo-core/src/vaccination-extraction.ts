import type { MedicalRecordItem } from "./schema";

/** True when the item has an explicit administered/given date on the document. */
export function hasVaccinationAdministrationProof(
  item: Pick<MedicalRecordItem, "administeredDate">
): boolean {
  return typeof item.administeredDate === "string" && item.administeredDate.trim() !== "";
}
