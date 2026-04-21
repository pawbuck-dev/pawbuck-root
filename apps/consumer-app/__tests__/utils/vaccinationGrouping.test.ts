import { latestVaccinationIdSet, normalizeVaccineNameForGrouping } from "@/utils/vaccinationGrouping";

describe("normalizeVaccineNameForGrouping", () => {
  it("trims and lowercases", () => {
    expect(normalizeVaccineNameForGrouping("  Rabies  ")).toBe("rabies");
  });
});

describe("latestVaccinationIdSet", () => {
  it("keeps the row with the latest administered date per normalized name", () => {
    const rows = [
      { id: "a", name: "Rabies", date: "2020-10-02" },
      { id: "b", name: "Rabies", date: "2021-11-03" },
      { id: "c", name: "DHPP", date: "2021-11-03" },
    ];
    const set = latestVaccinationIdSet(rows);
    expect(set.has("b")).toBe(true);
    expect(set.has("a")).toBe(false);
    expect(set.has("c")).toBe(true);
  });

  it("treats different casing as the same vaccine", () => {
    const rows = [
      { id: "x", name: "rabies", date: "2022-01-01" },
      { id: "y", name: "RABIES", date: "2021-01-01" },
    ];
    expect(latestVaccinationIdSet(rows)).toEqual(new Set(["x"]));
  });
});
