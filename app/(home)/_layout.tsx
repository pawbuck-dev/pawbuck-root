import { PetsProvider } from "@/context/petsContext";
import { Slot } from "expo-router";

export default function TabsLayout() {
  return (
    <PetsProvider>
      <Slot />
    </PetsProvider>
  );
}
