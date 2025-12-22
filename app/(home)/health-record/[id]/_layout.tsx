import { ClinicalExamsProvider } from "@/context/clinicalExamsContext";
import { LabResultsProvider } from "@/context/labResultsContext";
import { MedicineSchedulesProvider } from "@/context/medicineSchedulesContext";
import { MedicinesProvider } from "@/context/medicinesContext";
import { SelectedPetProvider } from "@/context/selectedPetContext";
import { VaccinationsProvider } from "@/context/vaccinationsContext";
import { Stack, useLocalSearchParams } from "expo-router";

export default function HealthRecordLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SelectedPetProvider petId={id}>
      <MedicineSchedulesProvider>
        <VaccinationsProvider>
          <MedicinesProvider>
            <LabResultsProvider>
              <ClinicalExamsProvider>
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
                  <Stack.Screen
                    name="exam-upload-modal"
                    options={{
                      presentation: "pageSheet",
                      headerShown: false,
                    }}
                  />
                </Stack>
              </ClinicalExamsProvider>
            </LabResultsProvider>
          </MedicinesProvider>
        </VaccinationsProvider>
      </MedicineSchedulesProvider>
    </SelectedPetProvider>
  );
}
