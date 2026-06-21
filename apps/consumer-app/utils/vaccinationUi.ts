import { VaccineCategory } from "@/services/vaccineRequirements";

export type VaccineDueBadgeVariant =
  | "overdue"
  | "dueGreen"
  | "dueOrange"
  | "previous";

export type VaccineDueBadge = {
  label: string;
  variant: VaccineDueBadgeVariant;
} | null;

export type VaccineDueBadgeOptions = {
  /**
   * When false, this row is an older dose of the same vaccine name; show a neutral "Previous dose" pill
   * instead of overdue / due-soon based on that row's next_due_date.
   */
  isLatestAdministrationForVaccine?: boolean;
};

/**
 * Figma-style status line: "Due in 25 days", "Overdue 10 Days", etc.
 * Only the latest administration per vaccine name should drive overdue/due-soon (see vaccinationGrouping).
 */
export function getVaccineDueBadge(
  nextDueDate: string | null,
  category: VaccineCategory,
  options?: VaccineDueBadgeOptions
): VaccineDueBadge {
  const isLatest = options?.isLatestAdministrationForVaccine !== false;
  if (!isLatest) {
    return { label: "Previous dose", variant: "previous" };
  }
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
  if (country === "Other") {
    return "Your pet's vaccination record looks complete for what you've logged. We don't apply a country-specific checklist for \"Other\" — ask your vet about local requirements.";
  }
  if (country === "United States" || country === "USA") {
    return "Your pet meets the common vaccination requirements for your area. Laws vary by state and locality — ask your vet to confirm what's right for your companion.";
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
