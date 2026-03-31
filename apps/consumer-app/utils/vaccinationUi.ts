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

/**
 * Body copy when all required vaccines for the pet's region are met (health hub + vaccinations UI).
 */
export function getRequiredVaccinesCompliantBody(country: string | null | undefined): string {
  if (country === "United States" || country === "USA") {
    return "Your pet meets all vaccination requirements mandated by U.S. state and federal regulations. Keep up the great work protecting your furry friend!";
  }
  if (country === "Canada") {
    return "Your pet meets all vaccination requirements under Canadian provincial and federal guidelines. Great job keeping your companion protected!";
  }
  if (country === "United Kingdom") {
    return "Your pet is fully vaccinated according to U.K. regulations. Excellent care for your pet!";
  }
  if (country) {
    return `Your pet is fully vaccinated according to ${country} regulations. Excellent care for your pet!`;
  }
  return "Your pet meets all vaccination requirements for your region. Excellent care for your pet!";
}
