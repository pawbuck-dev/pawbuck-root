import { VaccineCategory } from "@/services/vaccineRequirements";

export type VaccineDueBadgeVariant = "overdue" | "dueGreen" | "dueOrange";

export type VaccineDueBadge = {
  label: string;
  variant: VaccineDueBadgeVariant;
} | null;

/**
 * Figma-style status line: "Due in 25 days", "Overdue 10 Days", etc.
 */
export function getVaccineDueBadge(
  nextDueDate: string | null,
  category: VaccineCategory
): VaccineDueBadge {
  if (!nextDueDate) return null;
  const due = new Date(nextDueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) {
    return {
      label: `Overdue ${Math.abs(diffDays)} Days`,
      variant: "overdue",
    };
  }
  if (diffDays === 0) {
    return {
      label: "Due today",
      variant: category === "recommended" ? "dueOrange" : "dueGreen",
    };
  }
  const label = `Due in ${diffDays} days`;
  if (category === "recommended") {
    return { label, variant: "dueOrange" };
  }
  return { label, variant: "dueGreen" };
}

export function categorySubtitle(category: VaccineCategory): string {
  switch (category) {
    case "required":
      return "Required vaccine";
    case "recommended":
      return "Recommended vaccine";
    default:
      return "Other vaccine";
  }
}
