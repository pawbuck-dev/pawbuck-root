/**
 * Heuristic daily food / water targets for the body tracker.
 * Not veterinary advice — rough starting points from species, optional weight, and breed keywords.
 */

export type BreedSizeTier = "toy" | "small" | "medium" | "large" | "giant" | "unknown";

export type IntakeSuggestion = {
  mealsPerDay: number;
  gramsPerMeal: number;
  waterCupsPerDay: number;
  mlPerCup: number;
  summary: string;
};

/** Metric cup assumption for “cups” UI when user has not set ml/cup. */
export const DEFAULT_ML_PER_CUP = 250;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function weightToKg(weightValue: number | null, weightUnit: string | null): number | null {
  if (weightValue == null || weightValue <= 0) return null;
  if (weightUnit === "kg") return weightValue;
  if (weightUnit === "lbs") return weightValue * 0.45359237;
  return null;
}

/** Infer rough size tier from breed name when weight is unknown. */
export function breedSizeTier(breed: string): BreedSizeTier {
  const b = (breed || "").toLowerCase();
  if (
    /(chihuahua|papillon|maltese|toy poodle|yorkshire|yorkie|pomeranian|affenpinscher|min pin|miniature pinscher|russell terrier toy|toy fox)/.test(
      b
    )
  ) {
    return "toy";
  }
  if (
    /(dachshund|beagle|corgi|french bulldog|pug|jack russell|border collie|sheltie|australian shepherd|boston terrier|cocker spaniel|shiba|medium poodle|whippet)/.test(
      b
    )
  ) {
    return "small";
  }
  if (/(golden retriever|labrador|german shepherd|husky|boxer|doberman|pointer|weimaraner|vizsla|australian cattle)/.test(b)) {
    return "large";
  }
  if (/(great dane|mastiff|saint bernard|newfoundland|irish wolfhound|bernese)/.test(b)) {
    return "giant";
  }
  if (/(retriever|shepherd|spaniel|collie|terrier|hound|poodle|mix|mixed|domestic)/.test(b)) {
    return "medium";
  }
  return "unknown";
}

function tierDailyFoodGramsDog(tier: BreedSizeTier): number {
  switch (tier) {
    case "toy":
      return 140;
    case "small":
      return 260;
    case "large":
      return 520;
    case "giant":
      return 800;
    case "medium":
    default:
      return 360;
  }
}

function tierWaterMlDog(tier: BreedSizeTier): number {
  switch (tier) {
    case "toy":
      return 450;
    case "small":
      return 750;
    case "large":
      return 1400;
    case "giant":
      return 2000;
    case "medium":
    default:
      return 1000;
  }
}

export type PetIntakeFields = {
  animal_type: string;
  breed: string;
  weight_value: number | null;
  weight_unit: string | null;
};

export function suggestIntakeFromPet(pet: PetIntakeFields): IntakeSuggestion {
  const species = (pet.animal_type || "").toLowerCase();
  const isCat = species.includes("cat");
  const kg = weightToKg(pet.weight_value, pet.weight_unit);
  const tier = breedSizeTier(pet.breed);

  const mlPerCup = DEFAULT_ML_PER_CUP;

  if (isCat) {
    const meals = 3;
    let dailyFood = 220;
    let waterMl = 700;
    if (kg != null) {
      dailyFood = clamp(Math.round(kg * 45), 120, 320);
      waterMl = clamp(Math.round(kg * 55), 400, 1200);
    } else if (tier === "toy") {
      dailyFood = 160;
      waterMl = 500;
    } else if (tier === "large" || tier === "giant") {
      dailyFood = 280;
      waterMl = 900;
    }
    const gramsPerMeal = clamp(Math.round(dailyFood / meals), 35, 200);
    const waterCups = clamp(Math.ceil(waterMl / mlPerCup), 3, 12);
    return {
      mealsPerDay: meals,
      gramsPerMeal,
      waterCupsPerDay: waterCups,
      mlPerCup,
      summary: kg != null ? `From weight (~${kg.toFixed(1)} kg) for a typical cat.` : `From breed size (${tier}) for a cat.`,
    };
  }

  const meals = 3;
  let dailyFood: number;
  let waterMl: number;
  if (kg != null) {
    dailyFood = clamp(Math.round(kg * 28), 150, 950);
    waterMl = clamp(Math.round(kg * 58), 500, 2200);
  } else {
    dailyFood = tierDailyFoodGramsDog(tier);
    waterMl = tierWaterMlDog(tier);
  }

  const gramsPerMeal = clamp(Math.round(dailyFood / meals), 40, 400);
  const waterCups = clamp(Math.ceil(waterMl / mlPerCup), 4, 14);

  return {
    mealsPerDay: meals,
    gramsPerMeal,
    waterCupsPerDay: waterCups,
    mlPerCup,
    summary: kg != null ? `From weight (~${kg.toFixed(1)} kg) for a typical dog.` : `From breed size (${tier}) for a dog.`,
  };
}

export type PetWithIntakePrefs = PetIntakeFields & {
  intake_meals_per_day: number | null;
  intake_grams_per_meal: number | null;
  intake_water_cups_per_day: number | null;
  intake_water_ml_per_cup: number | null;
};

/** Effective targets for UI: saved pet prefs override heuristics per field. */
export function resolveIntakePrefs(pet: PetWithIntakePrefs | null): IntakeSuggestion {
  const base = suggestIntakeFromPet(
    pet ?? { animal_type: "dog", breed: "", weight_value: null, weight_unit: null }
  );
  if (!pet) return base;
  return {
    mealsPerDay: pet.intake_meals_per_day ?? base.mealsPerDay,
    gramsPerMeal: pet.intake_grams_per_meal ?? base.gramsPerMeal,
    waterCupsPerDay: pet.intake_water_cups_per_day ?? base.waterCupsPerDay,
    mlPerCup: pet.intake_water_ml_per_cup ?? base.mlPerCup,
    summary: base.summary,
  };
}
