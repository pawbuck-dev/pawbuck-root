import { useOnboarding } from "@/context/onboardingContext";
import { useSubscription } from "@/context/subscriptionContext";
import { navigateToAddPetFlow } from "@/utils/navigateToAddPetFlow";
import { useRouter } from "expo-router";
import { useCallback } from "react";

/** Central add-pet routing with Family plan paywall when adding a second+ pet. */
export function useAddPetNavigation() {
  const router = useRouter();
  const { resetOnboarding } = useOnboarding();
  const { plan, isLoading, openPaywall } = useSubscription();

  const navigateToAddPet = useCallback(
    (hasExistingPets: boolean, mode: "push" | "replace" = "push") => {
      if (hasExistingPets && !isLoading && plan !== "family") {
        openPaywall({ source: "multi_pet", requiredPlan: "family" });
        return;
      }
      navigateToAddPetFlow({
        router,
        hasExistingPets,
        resetOnboarding,
        mode,
      });
    },
    [router, resetOnboarding, plan, isLoading, openPaywall]
  );

  return { navigateToAddPet };
}
