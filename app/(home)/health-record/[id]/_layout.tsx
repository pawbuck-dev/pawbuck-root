import { SelectedPetProvider } from "@/context/selectedPetContext";
import { VaccinationsProvider } from "@/context/vaccinationsContext";
import { MedicinesProvider } from "@/context/medicinesContext";
import { LabResultsProvider } from "@/context/labResultsContext";
import { Stack, useLocalSearchParams } from "expo-router";

export default function HealthRecordLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SelectedPetProvider petId={id}>
      <VaccinationsProvider>
        <MedicinesProvider>
          <LabResultsProvider>
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
                presentation: "pageSheet",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="medication-upload-modal"
              options={{
                presentation: "pageSheet",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="lab-result-upload-modal"
              options={{
                presentation: "pageSheet",
                headerShown: false,
              }}
            />
          </Stack>
          </LabResultsProvider>
        </MedicinesProvider>
      </VaccinationsProvider>
    </SelectedPetProvider>
  );
}
