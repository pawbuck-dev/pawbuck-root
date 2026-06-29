export type VaccinationGroupingRow = {
  id: string;
  name: string;
  date: string;
};

export function normalizeVaccineNameForGrouping(name: string | null | undefined): string {
  return (name ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

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
