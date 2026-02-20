import { useSelectedPet } from "@/context/selectedPetContext";
import { useVaccinations } from "@/context/vaccinationsContext";
import { Tables } from "@/database.types";
import {
    CategorizedVaccine,
    categorizeVaccinations,
    findCanonicalKey,
    getVaccineEquivalencies,
    getVaccineRequirements,
    VaccineEquivalency,
    VaccineRequirement,
} from "@/services/vaccineRequirements";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

type Vaccination = Tables<"vaccinations">;

export interface RequiredVaccinesStatus {
  /** Total number of required vaccines for the country/animal type */
  total: number;
  /** Number of required vaccines that have been administered */
  administered: number;
  /** List of missing required vaccine requirements */
  missing: VaccineRequirement[];
  /** List of administered required vaccine requirements */
  administeredList: VaccineRequirement[];
}

interface UseVaccineCategoriesResult {
  /** Vaccinations categorized into required, recommended, and other */
  categorizedVaccinations: {
    required: CategorizedVaccine<Vaccination>[];
    recommended: CategorizedVaccine<Vaccination>[];
    other: CategorizedVaccine<Vaccination>[];
  };
  /** Status of required vaccines (administered vs missing) */
  requiredVaccinesStatus: RequiredVaccinesStatus;
  /** All vaccine requirements for the pet's country/animal type */
  requirements: VaccineRequirement[];
  /** All vaccine equivalencies */
  equivalencies: VaccineEquivalency[];
  /** Loading state for requirements and equivalencies */
  isLoadingRequirements: boolean;
  /** Error from fetching requirements or equivalencies */
  error: Error | null;
}

/**
 * Get the canonical key for a vaccination name
 * First tries equivalencies, then falls back to checking if the name matches a requirement directly
 */
const getCanonicalKeyForVaccination = (
  vaccineName: string,
  equivalencies: VaccineEquivalency[],
  requirements: VaccineRequirement[]
): string | null => {
  // Try to find via equivalencies first
  const canonicalFromEquivalencies = findCanonicalKey(vaccineName, equivalencies);
  if (canonicalFromEquivalencies) return canonicalFromEquivalencies;

  // Try to match directly against requirement vaccine names or canonical keys
  const normalizedName = vaccineName.toLowerCase().trim();
  
  for (const req of requirements) {
    // Check if vaccine name matches the requirement's vaccine_name
    if (req.vaccine_name.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(req.vaccine_name.toLowerCase())) {
      return req.canonical_key;
    }
    // Check if vaccine name contains the canonical key
    if (normalizedName.includes(req.canonical_key.toLowerCase())) {
      return req.canonical_key;
    }
  }

  return null;
};

/**
 * Hook to categorize vaccinations into required, recommended, and other sections
 * based on the pet's country and animal type
 */
export const useVaccineCategories = (): UseVaccineCategoriesResult => {
  const { pet } = useSelectedPet();
  const { vaccinations } = useVaccinations();

  // Fetch vaccine requirements for the pet's country and animal type
  const {
    data: requirements = [],
    isLoading: isLoadingRequirements,
    error: requirementsError,
  } = useQuery({
    queryKey: ["vaccineRequirements", pet.country, pet.animal_type],
    queryFn: () => getVaccineRequirements(pet.country, pet.animal_type),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (reference data doesn't change often)
  });

  // Fetch all vaccine equivalencies
  const {
    data: equivalencies = [],
    isLoading: isLoadingEquivalencies,
    error: equivalenciesError,
  } = useQuery({
    queryKey: ["vaccineEquivalencies"],
    queryFn: getVaccineEquivalencies,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Categorize vaccinations based on requirements and equivalencies
  const categorizedVaccinations = useMemo(() => {
    if (isLoadingRequirements || isLoadingEquivalencies) {
      return {
        required: [],
        recommended: [],
        other: [],
      };
    }

    return categorizeVaccinations(vaccinations, requirements, equivalencies);
  }, [vaccinations, requirements, equivalencies, isLoadingRequirements, isLoadingEquivalencies]);

  // Calculate required vaccines status
  const requiredVaccinesStatus = useMemo((): RequiredVaccinesStatus => {
    if (isLoadingRequirements || isLoadingEquivalencies) {
      return {
        total: 0,
        administered: 0,
        missing: [],
        administeredList: [],
      };
    }

    // Get all required vaccines from requirements
    const requiredVaccines = requirements.filter((req) => req.is_required);
    const total = requiredVaccines.length;

    if (total === 0) {
      return {
        total: 0,
        administered: 0,
        missing: [],
        administeredList: [],
      };
    }

    // Get canonical keys for all pet vaccinations that are NOT expired
    // A vaccination is expired if next_due_date exists and is in the past
    const petVaccinationCanonicalKeys = new Set<string>();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

    for (const vaccination of vaccinations) {
      // Check if vaccination is expired
      const isExpired =
        vaccination.next_due_date &&
        new Date(vaccination.next_due_date) < today;

      // Only count non-expired vaccinations
      if (!isExpired) {
        const canonicalKey = getCanonicalKeyForVaccination(
          vaccination.name,
          equivalencies,
          requirements
        );
        if (canonicalKey) {
          petVaccinationCanonicalKeys.add(canonicalKey);
        }
      }
    }

    // Determine which required vaccines are administered vs missing
    const administered: VaccineRequirement[] = [];
    const missing: VaccineRequirement[] = [];

    for (const requiredVaccine of requiredVaccines) {
      if (petVaccinationCanonicalKeys.has(requiredVaccine.canonical_key)) {
        administered.push(requiredVaccine);
      } else {
        missing.push(requiredVaccine);
      }
    }

    return {
      total,
      administered: administered.length,
      missing,
      administeredList: administered,
    };
  }, [vaccinations, requirements, equivalencies, isLoadingRequirements, isLoadingEquivalencies]);

  return {
    categorizedVaccinations,
    requiredVaccinesStatus,
    requirements,
    equivalencies,
    isLoadingRequirements: isLoadingRequirements || isLoadingEquivalencies,
    error: requirementsError || equivalenciesError,
  };
};
