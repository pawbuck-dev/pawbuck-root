import React, { createContext, ReactNode, useContext, useState } from "react";
import { TablesInsert } from "../database.types";

// Base pet data from database schema
type PetInsert = TablesInsert<"pets">;

// Pet data interface based on database schema
export type PetData = Partial<Omit<PetInsert, "user_id" | "created_at" | "id">>;

interface OnboardingContextType {
  petData: PetData;
  updatePetData: (data: Partial<PetData>) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [petData, setPetData] = useState<PetData>({});

  const updatePetData = (data: Partial<PetData>) => {
    setPetData((prev) => ({ ...prev, ...data }));
  };

  return (
    <OnboardingContext.Provider
      value={{
        petData,
        updatePetData,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
};
