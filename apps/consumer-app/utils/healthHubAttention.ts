/**
 * Health Records hub — shared “attention” rules for banner + pet strip badges.
 * Overdue counts only the latest administration per vaccine name (see vaccinationGrouping).
 */

import type { RequiredVaccinesStatus } from "@/services/vaccineRequirements";
import { latestVaccinationIdSet } from "@/utils/vaccinationGrouping";

export type VaccinationDueRow = {
  id: string;
  name: string;
  date: string;
  next_due_date: string | null | undefined;
};

export function countOverdueVaccinations(vaccinations: VaccinationDueRow[]): number {
  if (vaccinations.length === 0) return 0;

  const latestIds = latestVaccinationIdSet(vaccinations);
  const now = new Date();
  let overdue = 0;
  for (const v of vaccinations) {
    if (!latestIds.has(v.id)) continue;
    if (v.next_due_date) {
      const d = new Date(v.next_due_date);
      if (d < now) overdue++;
    }
  }
  return overdue;
}

export function countMissingRequiredVaccines(required: RequiredVaccinesStatus): number {
  return required.missing.length;
}

export function buildHealthAttentionSubtitle(
  missingRequired: number,
  overdue: number
): string {
  const parts: string[] = [];
  if (missingRequired > 0) {
    parts.push(
      missingRequired === 1
        ? "1 required vaccine missing"
        : `${missingRequired} required vaccines missing`
    );
  }
  if (overdue > 0) {
    parts.push(overdue === 1 ? "1 overdue vaccine" : `${overdue} overdue vaccines`);
  }
  return parts.join(" · ");
}

/** 6-digit #RRGGBB → rgba for soft primary surfaces */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
