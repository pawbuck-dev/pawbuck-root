import { useAddPetNavigation } from "@/hooks/useAddPetNavigation";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

/** Redirect legacy add-pet links into the canonical onboarding wizard. */
export default function AddPetRedirect() {
  const { theme } = useTheme();
  const { pets, loadingPets } = usePets();
  const { navigateToAddPet } = useAddPetNavigation();

  useEffect(() => {
    if (loadingPets) return;
    navigateToAddPet(pets.length > 0, "replace");
  }, [loadingPets, pets.length, navigateToAddPet]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background }}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}
