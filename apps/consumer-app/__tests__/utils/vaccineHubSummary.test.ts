import { buildVaccineHubSummaryFromInputs } from "@/utils/vaccineHubSummary";
import type { VaccineEquivalency, VaccineRequirement } from "@/services/vaccineRequirements";

const canadaRequirements: VaccineRequirement[] = [
  {
    id: "1",
    country: "Canada",
    animal_type: "dog",
    vaccine_name: "Rabies",
    canonical_key: "rabies",
    is_required: true,
    frequency_months: 36,
    description: null,
    created_at: "",
  },
  {
    id: "2",
    country: "Canada",
    animal_type: "dog",
    vaccine_name: "DA2PP (Distemper Combo)",
    canonical_key: "da2pp",
    is_required: true,
    frequency_months: 36,
    description: null,
    created_at: "",
  },
];

const equivalencies: VaccineEquivalency[] = [
  {
    id: "e1",
    canonical_name: "da2pp",
    variant_name: "DAPP",
    notes: null,
    created_at: null,
  },
];

describe("buildVaccineHubSummary", () => {
  it("shows action required when required vaccines are missing", () => {
    const { summary } = buildVaccineHubSummaryFromInputs(
      [{ name: "Certificate of Vaccination", next_due_date: "2028-04-06" }],
      canadaRequirements,
      equivalencies
    );
    expect(summary.badge.label).toBe("Action required");
    expect(summary.primary).toContain("required vaccine");
  });

  it("shows compliant when required vaccines are satisfied and not overdue", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 2);
    const { summary } = buildVaccineHubSummaryFromInputs(
      [
        { name: "Rabies", next_due_date: future.toISOString() },
        { name: "DAPP", next_due_date: future.toISOString() },
      ],
      canadaRequirements,
      equivalencies
    );
    expect(summary.badge.label).toBe("Compliant");
    expect(summary.primary).toContain("required vaccines up to date");
  });

  it("shows no records when vaccination list is empty", () => {
    const { summary } = buildVaccineHubSummaryFromInputs([], canadaRequirements, equivalencies);
    expect(summary.badge.label).toBe("No records");
    expect(summary.primary).toBe("Add vaccine records");
  });
});
