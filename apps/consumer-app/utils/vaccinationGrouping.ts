/**
 * Groups vaccination rows by normalized name so overdue/due UI reflects the
 * most recent shot only (older doses stay visible as history without duplicate "Overdue" noise).
 */

export type VaccinationGroupingRow = {
  id: string;
  name: string;
  date: string;
};

/** Trim, lowercase, collapse spaces — "Rabies" and " rabies  " match. */
export function normalizeVaccineNameForGrouping(name: string | null | undefined): string {
  return (name ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * IDs of rows that have the latest `date` (administration) among rows with the same normalized name.
 * Rows with empty names are not grouped with each other (each uses its own id as group key).
 */
export function latestVaccinationIdSet(
  vaccinations: ReadonlyArray<VaccinationGroupingRow>
): Set<string> {
  const best = new Map<string, { id: string; t: number }>();

  for (const v of vaccinations) {
    const label = normalizeVaccineNameForGrouping(v.name);
    const groupKey = label ? label : `__id:${v.id}`;
    const t = new Date(v.date).getTime();
    if (Number.isNaN(t)) continue;

    const cur = best.get(groupKey);
    if (!cur || t > cur.t || (t === cur.t && v.id > cur.id)) {
      best.set(groupKey, { id: v.id, t });
    }
  }

  return new Set([...best.values()].map((x) => x.id));
}

export function isLatestVaccinationRow(
  vaccinations: ReadonlyArray<VaccinationGroupingRow>,
  vaccinationId: string
): boolean {
  const latest = latestVaccinationIdSet(vaccinations);
  return latest.has(vaccinationId);
}
