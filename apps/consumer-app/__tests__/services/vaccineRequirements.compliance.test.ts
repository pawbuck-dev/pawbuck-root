import {
  computeRequiredVaccinesStatus,
  type VaccineEquivalency,
  type VaccineRequirement,
} from "@/services/vaccineRequirements";

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

describe("computeRequiredVaccinesStatus", () => {
  it("counts DAPP as satisfying DA2PP via equivalency", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 2);
    const status = computeRequiredVaccinesStatus(
      [
        { name: "Rabies", next_due_date: future.toISOString() },
        { name: "DAPP", next_due_date: future.toISOString() },
      ],
      canadaRequirements,
      equivalencies
    );
    expect(status.total).toBe(2);
    expect(status.administered).toBe(2);
    expect(status.missing).toHaveLength(0);
  });

  it("does not count generic certificate title toward required vaccines", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 2);
    const status = computeRequiredVaccinesStatus(
      [{ name: "Certificate of Vaccination", next_due_date: future.toISOString() }],
      canadaRequirements,
      equivalencies
    );
    expect(status.administered).toBe(0);
    expect(status.missing).toHaveLength(2);
  });
});
