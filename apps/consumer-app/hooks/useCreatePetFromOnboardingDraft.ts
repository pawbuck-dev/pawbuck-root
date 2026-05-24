import { useOnboarding } from "@/context/onboardingContext";
import { usePets } from "@/context/petsContext";
import type { TablesInsert } from "@/database.types";
import { useCallback } from "react";

/** After auth, create a pet from the onboarding AsyncStorage draft if present. */
export function useCreatePetFromOnboardingDraft() {
  const { isOnboardingComplete, petData, resetOnboarding } = useOnboarding();
  const { addPet } = usePets();

  return useCallback(async () => {
    if (!isOnboardingComplete || !petData?.name) return;
    try {
      await addPet(petData as TablesInsert<"pets">);
    } catch (error) {
      console.error("Error creating pet from onboarding draft:", error);
    } finally {
      resetOnboarding();
    }
  }, [addPet, isOnboardingComplete, petData, resetOnboarding]);
}
