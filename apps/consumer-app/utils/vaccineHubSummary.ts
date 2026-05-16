import {
  computeRequiredVaccinesStatus,
  type RequiredVaccinesStatus,
  type VaccinationForCompliance,
} from "@/services/vaccineRequirements";
import { countOverdueVaccinations, type VaccinationDueRow } from "@/utils/healthHubAttention";
import { latestVaccinationIdSet } from "@/utils/vaccinationGrouping";

export type VaccineHubBadgeVariant = "success" | "warning" | "neutral";

export type VaccineHubSummary = {
  badge: { label: string; variant: VaccineHubBadgeVariant };
  primary: string;
  secondary: string | null;
  nextLine: string | null;
};

export function buildVaccineHubSummary(
  vaccinations: VaccinationDueRow[],
  required: RequiredVaccinesStatus,
  options?: { hasRequirementsModel?: boolean }
): VaccineHubSummary {
  const hasRequirementsModel = options?.hasRequirementsModel ?? required.total > 0;

  if (vaccinations.length === 0) {
    return {
      badge: { label: "No records", variant: "neutral" },
      primary: "Add vaccine records",
      secondary: null,
      nextLine: null,
    };
  }

  if (hasRequirementsModel && required.missing.length > 0) {
    const n = required.missing.length;
    const names = required.missing.map((m) => m.vaccine_name).join(", ");
    return {
      badge: { label: "Action required", variant: "warning" },
      primary: n === 1 ? "1 required vaccine missing" : `${n} required vaccines missing`,
      secondary: names,
      nextLine: "Missing",
    };
  }

  const overdue = countOverdueVaccinations(vaccinations);
  if (overdue > 0) {
    return {
      badge: { label: `${overdue} Overdue`, variant: "warning" },
      primary: "Review vaccination schedule",
      secondary: null,
      nextLine: null,
    };
  }

  if (hasRequirementsModel && required.total > 0 && required.administered === required.total) {
    return {
      badge: { label: "Compliant", variant: "success" },
      primary: "All required vaccines up to date",
      secondary: null,
      nextLine: null,
    };
  }

  const latestIds = latestVaccinationIdSet(vaccinations);
  let nearestDue: Date | null = null;
  const now = new Date();
  for (const v of vaccinations) {
    if (!latestIds.has(v.id)) continue;
    if (v.next_due_date) {
      const d = new Date(v.next_due_date);
      if (d >= now && (!nearestDue || d < nearestDue)) nearestDue = d;
    }
  }

  const formatDate = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return {
    badge: { label: "Compliant", variant: "success" },
    primary: "All vaccines up to date",
    secondary: nearestDue ? formatDate(nearestDue) : null,
    nextLine: nearestDue ? "Next Due" : null,
  };
}

/** Build required status + hub summary from raw inputs (for tests and multi-pet badges). */
export function buildVaccineHubSummaryFromInputs(
  vaccinations: VaccinationForCompliance[],
  requirements: Parameters<typeof computeRequiredVaccinesStatus>[1],
  equivalencies: Parameters<typeof computeRequiredVaccinesStatus>[2]
): { required: RequiredVaccinesStatus; summary: VaccineHubSummary } {
  const required = computeRequiredVaccinesStatus(vaccinations, requirements, equivalencies);
  const rows: VaccinationDueRow[] = vaccinations.map((v, i) => ({
    id: String(i),
    name: v.name,
    date: "",
    next_due_date: v.next_due_date,
  }));
  return {
    required,
    summary: buildVaccineHubSummary(rows, required, {
      hasRequirementsModel: required.total > 0,
    }),
  };
}
