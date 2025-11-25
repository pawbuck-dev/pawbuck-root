import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useState, ReactNode } from "react";

// Define the pet data structure
export interface PetData {
  // Step 1 - Location
  country?: string;
  
  // Step 2 - Basic Info
  petName?: string;
  petType?: "dog" | "cat" | "other";
  breed?: string;
  
  // Step 2 - More Details
  age?: number;
  weight?: number;
  weightUnit?: "pounds" | "kilograms";
  gender?: "male" | "female";
  birthDate?: string;
  
  // Step 3 - Health Status
  isNeutered?: boolean;
  hasAllergies?: boolean;
  allergies?: string[];
  
  // Step 4 - Medical History
  vaccinations?: string[];
  lastVetVisit?: string;
  
  // Step 5 - Current Medications
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  
  // Step 6 - Diet Information
  dietType?: string;
  feedingSchedule?: string;
  
  // Step 7 - Emergency Contact
  vetName?: string;
  vetPhone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  
  // Step 8 - Additional Notes
  specialNeeds?: string;
  behaviorNotes?: string;
  microchipNumber?: string;
}

interface OnboardingContextType {
  petData: PetData;
  currentStep: number;
  updatePetData: (data: Partial<PetData>) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  resetOnboarding: () => void;
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
  const [currentStep, setCurrentStep] = useState<number>(1);

  const updatePetData = (data: Partial<PetData>) => {
    setPetData((prev) => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    if (currentStep < 8) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= 8) {
      setCurrentStep(step);
    }
  };

  const resetOnboarding = () => {
    setPetData({});
    setCurrentStep(1);
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
        currentStep,
        updatePetData,
        nextStep,
        previousStep,
        goToStep,
        resetOnboarding,
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

