import { SelectedPetProvider } from "@/context/selectedPetContext";
import { VaccinationsProvider } from "@/context/vaccinationsContext";
import { Slot, useLocalSearchParams } from "expo-router";

export default function HealthRecordLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SelectedPetProvider petId={id}>
      <VaccinationsProvider>
        <Slot />
      </VaccinationsProvider>
    </SelectedPetProvider>
  );
}
