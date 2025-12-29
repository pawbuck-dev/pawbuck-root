import { supabase } from "@/utils/supabase";

// Types for the new tables
export interface VaccineRequirement {
  id: string;
  country: string;
  animal_type: string;
  vaccine_name: string;
  canonical_key: string;
  is_required: boolean;
  frequency_months: number | null;
  description: string | null;
  created_at: string;
}

export interface VaccineEquivalency {
  id: string;
  canonical_name: string;
  variant_name: string;
  notes: string | null;
  created_at: string;
}

export type VaccineCategory = "required" | "recommended" | "other";

export interface CategorizedVaccine<T> {
  vaccination: T;
  category: VaccineCategory;
  matchedRequirement: VaccineRequirement | null;
}

/**
 * Fetch vaccine requirements for a specific country and animal type
 */
export const getVaccineRequirements = async (
  country: string,
  animalType: string
): Promise<VaccineRequirement[]> => {
  const { data, error } = await supabase
    .from("country_vaccine_requirements")
    .select("*")
    .eq("country", country)
    .eq("animal_type", animalType.toLowerCase());

  if (error) throw error;
  return data || [];
};

/**
 * Fetch all vaccine equivalencies
 */
export const getVaccineEquivalencies = async (): Promise<VaccineEquivalency[]> => {
  const { data, error } = await supabase
    .from("vaccine_equivalencies")
    .select("*");

  if (error) throw error;
  return data || [];
};

/**
 * Normalize a vaccine name for comparison
 */
const normalizeVaccineName = (name: string): string => {
  return name.toLowerCase().trim();
};

/**
 * Find the canonical key for a vaccine name using equivalencies
 */
export const findCanonicalKey = (
  vaccineName: string,
  equivalencies: VaccineEquivalency[]
): string | null => {
  const normalizedName = normalizeVaccineName(vaccineName);

  // Try exact match first
  const exactMatch = equivalencies.find(
    (eq) => normalizeVaccineName(eq.variant_name) === normalizedName
  );
  if (exactMatch) return exactMatch.canonical_name;

  // Try partial match (vaccine name contains variant or vice versa)
  const partialMatch = equivalencies.find(
    (eq) =>
      normalizedName.includes(normalizeVaccineName(eq.variant_name)) ||
      normalizeVaccineName(eq.variant_name).includes(normalizedName)
  );
  if (partialMatch) return partialMatch.canonical_name;

  return null;
};

/**
 * Find a matching requirement for a vaccine
 */
export const findMatchingRequirement = (
  vaccineName: string,
  requirements: VaccineRequirement[],
  equivalencies: VaccineEquivalency[]
): VaccineRequirement | null => {
  const normalizedName = normalizeVaccineName(vaccineName);

  // First, try to find canonical key through equivalencies
  const canonicalKey = findCanonicalKey(vaccineName, equivalencies);

  if (canonicalKey) {
    // Match by canonical key
    const match = requirements.find((req) => req.canonical_key === canonicalKey);
    if (match) return match;
  }

  // Try exact match on vaccine_name in requirements
  const exactMatch = requirements.find(
    (req) => normalizeVaccineName(req.vaccine_name) === normalizedName
  );
  if (exactMatch) return exactMatch;

  // Try partial match on vaccine_name (vaccine contains requirement name or vice versa)
  const partialMatch = requirements.find(
    (req) =>
      normalizedName.includes(normalizeVaccineName(req.vaccine_name)) ||
      normalizeVaccineName(req.vaccine_name).includes(normalizedName)
  );
  if (partialMatch) return partialMatch;

  // Try matching canonical_key directly (e.g., "RABIES" in name)
  const canonicalMatch = requirements.find((req) =>
    normalizedName.includes(req.canonical_key.toLowerCase())
  );
  if (canonicalMatch) return canonicalMatch;

  return null;
};

/**
 * Categorize a single vaccination
 */
export const categorizeVaccination = <T extends { name: string }>(
  vaccination: T,
  requirements: VaccineRequirement[],
  equivalencies: VaccineEquivalency[]
): CategorizedVaccine<T> => {
  const matchedRequirement = findMatchingRequirement(
    vaccination.name,
    requirements,
    equivalencies
  );

  let category: VaccineCategory;
  if (matchedRequirement) {
    category = matchedRequirement.is_required ? "required" : "recommended";
  } else {
    category = "other";
  }

  return {
    vaccination,
    category,
    matchedRequirement,
  };
};

/**
 * Categorize multiple vaccinations
 */
export const categorizeVaccinations = <T extends { name: string }>(
  vaccinations: T[],
  requirements: VaccineRequirement[],
  equivalencies: VaccineEquivalency[]
): {
  required: CategorizedVaccine<T>[];
  recommended: CategorizedVaccine<T>[];
  other: CategorizedVaccine<T>[];
} => {
  const result = {
    required: [] as CategorizedVaccine<T>[],
    recommended: [] as CategorizedVaccine<T>[],
    other: [] as CategorizedVaccine<T>[],
  };

  for (const vaccination of vaccinations) {
    const categorized = categorizeVaccination(vaccination, requirements, equivalencies);
    result[categorized.category].push(categorized);
  }

  return result;
};

