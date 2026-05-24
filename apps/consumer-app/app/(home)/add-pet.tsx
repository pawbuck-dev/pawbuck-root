import { useOnboarding } from "@/context/onboardingContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { navigateToAddPetFlow } from "@/utils/navigateToAddPetFlow";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

/** Redirect legacy add-pet links into the canonical onboarding wizard. */
export default function AddPetRedirect() {
  const router = useRouter();
  const { theme } = useTheme();
  const { pets, loadingPets } = usePets();
  const { resetOnboarding } = useOnboarding();

  useEffect(() => {
    if (loadingPets) return;
    navigateToAddPetFlow({
      router,
      hasExistingPets: pets.length > 0,
      resetOnboarding,
      mode: "replace",
    });
  }, [loadingPets, pets.length, resetOnboarding, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background }}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}
