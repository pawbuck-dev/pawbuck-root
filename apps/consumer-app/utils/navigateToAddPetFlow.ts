import type { Router } from "expo-router";

type NavigateToAddPetFlowArgs = {
  router: Pick<Router, "push" | "replace">;
  hasExistingPets: boolean;
  resetOnboarding: () => void;
  mode?: "push" | "replace";
};

/** Route into the canonical multi-step pet onboarding flow. */
export function navigateToAddPetFlow({
  router,
  hasExistingPets,
  resetOnboarding,
  mode = "push",
}: NavigateToAddPetFlowArgs) {
  resetOnboarding();
  const pathname = hasExistingPets ? "/onboarding/step2" : "/onboarding/step1";
  if (mode === "replace") {
    router.replace(pathname);
  } else {
    router.push(pathname);
  }
}
