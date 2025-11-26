import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, ReactNode, useContext, useState } from "react";
import { TablesInsert } from "../database.types";

// Base pet data from database schema
type PetInsert = TablesInsert<"pets">;

// Pet data interface based on database schema
export type PetData = Partial<Omit<PetInsert, "user_id" | "created_at" | "id">>;

interface OnboardingContextType {
  petData: PetData;
  updatePetData: (data: Partial<PetData>) => void;
  saveToStorage: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

const STORAGE_KEY = "@pawbuck_pet_data";

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [petData, setPetData] = useState<PetData>({});

  const updatePetData = (data: Partial<PetData>) => {
    setPetData((prev) => ({ ...prev, ...data }));
  };

  const saveToStorage = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(petData));
      console.log("Pet data saved to storage");
    } catch (error) {
      console.error("Error saving pet data:", error);
    }
  };

  const loadFromStorage = async () => {
    try {
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedData) {
        setPetData(JSON.parse(storedData));
        console.log("Pet data loaded from storage");
      }
    } catch (error) {
      console.error("Error loading pet data:", error);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        petData,
        updatePetData,
        saveToStorage,
        loadFromStorage,
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
