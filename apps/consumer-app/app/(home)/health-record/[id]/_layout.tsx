import { ClinicalExamsProvider } from "@/context/clinicalExamsContext";
import { LabResultsProvider } from "@/context/labResultsContext";
import { MedicinesProvider } from "@/context/medicinesContext";
import { SelectedPetProvider } from "@/context/selectedPetContext";
import { VaccinationsProvider } from "@/context/vaccinationsContext";
import { useTheme } from "@/context/themeContext";
import { Stack, useLocalSearchParams } from "expo-router";

export default function HealthRecordLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();

  return (
    <SelectedPetProvider petId={id}>
      <VaccinationsProvider>
        <MedicinesProvider>
          <LabResultsProvider>
            <ClinicalExamsProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: theme.background },
                }}
              >
                <Stack.Screen name="index" />
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
    </SelectedPetProvider>
  );
}
