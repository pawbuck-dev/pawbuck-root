import {
  buildComplianceBanner,
  buildLatestVaccineRows,
  hasCoreTravelReadiness,
  maskMicrochip,
  maskPhone,
  vetSummaryFreshnessLabel,
} from "@/utils/healthExportFormatters";
import type { Tables } from "@/database.types";

describe("healthExportFormatters", () => {
  it("masks microchip", () => {
    expect(maskMicrochip("9851410000002847")).toMatch(/2847$/);
    expect(maskMicrochip("9851410000002847")).toContain("•");
  });

  it("masks phone", () => {
    expect(maskPhone("+16045551247")).toContain("47");
  });

  it("builds latest vaccine rows only", () => {
    const rows = buildLatestVaccineRows([
      {
        id: "a",
        name: "Rabies",
        date: "2025-01-01",
        next_due_date: "2028-01-01",
        clinic_name: "Clinic",
        pet_id: "p",
        user_id: "u",
        created_at: "",
        document_url: null,
        notes: null,
      },
      {
        id: "b",
        name: "Rabies",
        date: "2024-01-01",
        next_due_date: "2027-01-01",
        clinic_name: "Old",
        pet_id: "p",
        user_id: "u",
        created_at: "",
        document_url: null,
        notes: null,
      },
    ] as Tables<"vaccinations">[]);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Rabies");
  });

  it("detects travel readiness", () => {
    const pet = {
      microchip_number: "123456789012345",
    } as Tables<"pets">;
    const ready = hasCoreTravelReadiness(pet, [
      {
        id: "1",
        name: "Rabies",
        date: "2025-01-01",
        pet_id: "p",
        user_id: "u",
        created_at: "",
        clinic_name: null,
        document_url: null,
        notes: null,
        next_due_date: null,
      },
      {
        id: "2",
        name: "DHPP",
        date: "2025-01-01",
        pet_id: "p",
        user_id: "u",
        created_at: "",
        clinic_name: null,
        document_url: null,
        notes: null,
        next_due_date: null,
      },
    ] as Tables<"vaccinations">[]);
    expect(ready).toBe(true);
  });

  it("builds compliance banner when empty", () => {
    const banner = buildComplianceBanner({ microchip_number: null } as Tables<"pets">, []);
    expect(banner?.headline).toContain("needed");
  });

  it("freshness label mentions valid days", () => {
    const label = vetSummaryFreshnessLabel(new Date().toISOString());
    expect(label).toMatch(/Fresh/);
  });
});
