import { useSelectedPet } from "@/context/selectedPetContext";
import { useOptionalVaccinations } from "@/context/vaccinationsContext";
import { Tables } from "@/database.types";
import { getVaccinationsByPetId } from "@/services/vaccinations";
import {
  CategorizedVaccine,
  categorizeVaccinations,
  computeRequiredVaccinesStatus,
  getVaccineEquivalencies,
  getVaccineRequirements,
  type RequiredVaccinesStatus,
  VaccineEquivalency,
  VaccineRequirement,
} from "@/services/vaccineRequirements";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

type Vaccination = Tables<"vaccinations">;

export type { RequiredVaccinesStatus };

interface UseVaccineCategoriesResult {
  categorizedVaccinations: {
    required: CategorizedVaccine<Vaccination>[];
    recommended: CategorizedVaccine<Vaccination>[];
    other: CategorizedVaccine<Vaccination>[];
  };
  requiredVaccinesStatus: RequiredVaccinesStatus;
  requirements: VaccineRequirement[];
  equivalencies: VaccineEquivalency[];
  isLoadingRequirements: boolean;
  error: Error | null;
}

/**
 * Hook to categorize vaccinations into required, recommended, and other sections
 * based on the pet's country and animal type
 */
export const useVaccineCategories = (): UseVaccineCategoriesResult => {
  const { pet } = useSelectedPet();
  const petId = pet?.id ?? "";
  const vaccinationsContext = useOptionalVaccinations();

  const { data: queriedVaccinations = [] } = useQuery({
    queryKey: ["vaccinations", petId],
    queryFn: () => getVaccinationsByPetId(petId),
    enabled: !!petId && vaccinationsContext === undefined,
  });

  const vaccinations = vaccinationsContext?.vaccinations ?? queriedVaccinations;
  const country = pet?.country ?? null;
  const animalType = pet?.animal_type ?? null;

  const {
    data: requirements = [],
    isLoading: isLoadingRequirements,
    error: requirementsError,
  } = useQuery({
    queryKey: ["vaccineRequirements", country, animalType],
    queryFn: () => getVaccineRequirements(country!, animalType!),
    enabled: country != null && animalType != null,
    staleTime: 1000 * 60 * 60,
  });

  const {
    data: equivalencies = [],
    isLoading: isLoadingEquivalencies,
    error: equivalenciesError,
  } = useQuery({
    queryKey: ["vaccineEquivalencies"],
    queryFn: getVaccineEquivalencies,
    staleTime: 1000 * 60 * 60,
  });

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

  const requiredVaccinesStatus = useMemo((): RequiredVaccinesStatus => {
    if (isLoadingRequirements || isLoadingEquivalencies) {
      return {
        total: 0,
        administered: 0,
        missing: [],
        administeredList: [],
      };
    }

    return computeRequiredVaccinesStatus(vaccinations, requirements, equivalencies);
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
