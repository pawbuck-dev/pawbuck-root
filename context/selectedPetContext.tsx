import { Tables } from "@/database.types";
import React, { createContext, ReactNode, useContext } from "react";
import { usePets } from "./petsContext";

// Pet type from database
export type Pet = Tables<"pets">;

interface SelectedPetContextType {
  /** The selected pet's data */
  pet: Pet;
}

const SelectedPetContext = createContext<SelectedPetContextType | undefined>(
  undefined
);

interface SelectedPetProviderProps {
  petId: string;
  children: ReactNode;
}

export const SelectedPetProvider: React.FC<SelectedPetProviderProps> = ({
  petId,
  children,
}) => {
  // Fetch the selected pet using React Query
  const { pets } = usePets();

  const pet = pets.find((p) => p.id === petId)!;

  return (
    <SelectedPetContext.Provider
      value={{
        pet,
      }}
    >
      {children}
    </SelectedPetContext.Provider>
  );
};

export const useSelectedPet = () => {
  const context = useContext(SelectedPetContext);
  if (context === undefined) {
    throw new Error("useSelectedPet must be used within a SelectedPetProvider");
  }
  return context;
};
