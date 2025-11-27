import { SelectedPetProvider } from "@/context/selectedPetContext";
import { VaccinationsProvider } from "@/context/vaccinationsContext";
import { Stack, useLocalSearchParams } from "expo-router";

export default function HealthRecordLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SelectedPetProvider petId={id}>
      <VaccinationsProvider>
        <Stack>
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="vaccination-upload-modal"
            options={{
              presentation: "formSheet",
              headerShown: false,
            }}
          />
        </Stack>
      </VaccinationsProvider>
    </SelectedPetProvider>
  );
}
