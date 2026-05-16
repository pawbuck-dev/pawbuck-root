import { breedSizeTier, suggestIntakeFromPet } from "@/utils/intakeBreedSuggestions";

describe("intakeBreedSuggestions", () => {
  describe("breedSizeTier", () => {
    it("detects toy breeds", () => {
      expect(breedSizeTier("Chihuahua")).toBe("toy");
    });
    it("detects giant breeds", () => {
      expect(breedSizeTier("Great Dane")).toBe("giant");
    });
  });

  describe("suggestIntakeFromPet", () => {
    it("uses weight for a dog when present", () => {
      const s = suggestIntakeFromPet({
        animal_type: "dog",
        breed: "Mix",
        weight_value: 10,
        weight_unit: "kg",
      });
      expect(s.mealsPerDay).toBe(3);
      expect(s.gramsPerMeal).toBeGreaterThan(40);
      expect(s.waterCupsPerDay).toBeGreaterThanOrEqual(4);
      expect(s.mlPerCup).toBe(250);
      expect(s.summary).toContain("kg");
    });

    it("uses breed tier when dog weight missing", () => {
      const s = suggestIntakeFromPet({
        animal_type: "dog",
        breed: "Great Dane",
        weight_value: null,
        weight_unit: null,
      });
      expect(s.gramsPerMeal * s.mealsPerDay).toBeGreaterThan(400);
    });

    it("returns cat-appropriate ranges", () => {
      const s = suggestIntakeFromPet({
        animal_type: "cat",
        breed: "Domestic Shorthair",
        weight_value: 4.5,
        weight_unit: "kg",
      });
      expect(s.mealsPerDay).toBe(3);
      expect(s.gramsPerMeal).toBeGreaterThanOrEqual(35);
      expect(s.summary.toLowerCase()).toContain("cat");
    });
  });
});
