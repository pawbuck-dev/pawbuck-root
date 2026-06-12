import { ClinicalExamsProvider } from "@/context/clinicalExamsContext";
import { LabResultsProvider } from "@/context/labResultsContext";
import { MedicinesProvider } from "@/context/medicinesContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { VaccinationsProvider } from "@/context/vaccinationsContext";
import { useTheme } from "@/context/themeContext";
import { useHealthRecordPetId } from "@/hooks/useHealthRecordPetId";
import { Stack } from "expo-router";
import { useEffect } from "react";

export default function HealthRecordLayout() {
  const routePetId = useHealthRecordPetId();
  const { setSelectedPetId } = useSelectedPet();
  const { theme } = useTheme();

  useEffect(() => {
    if (routePetId) setSelectedPetId(routePetId);
  }, [routePetId, setSelectedPetId]);

  if (!routePetId) {
    return null;
  }

  return (
    <VaccinationsProvider key={routePetId}>
      <MedicinesProvider key={routePetId}>
        <LabResultsProvider key={routePetId}>
          <ClinicalExamsProvider key={routePetId}>
            <Stack
              key={routePetId}
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.background },
              }}
            >
                <Stack.Screen name="index" />
                <Stack.Screen
                  name="body-tracker"
                  options={{
                    headerShown: false,
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen name="(tabs)" />
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
                    headerShown: false,
                    animation: "slide_from_right",
                    contentStyle: { backgroundColor: theme.background },
                  }}
                />
                <Stack.Screen
                  name="lab-result-upload-modal"
                  options={{
                    presentation: "pageSheet",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="exam-upload-modal"
                  options={{
                    presentation: "pageSheet",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="vaccination-detail"
                  options={{
                    headerShown: false,
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen
                  name="medicine-detail"
                  options={{
                    headerShown: false,
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen
                  name="exam-detail"
                  options={{
                    headerShown: false,
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen
                  name="lab-detail"
                  options={{
                    headerShown: false,
                    animation: "slide_from_right",
                  }}
                />
            </Stack>
          </ClinicalExamsProvider>
        </LabResultsProvider>
      </MedicinesProvider>
    </VaccinationsProvider>
  );
}
