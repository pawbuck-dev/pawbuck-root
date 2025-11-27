import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { TablesInsert } from "../database.types";

// Base pet data from database schema
type PetInsert = TablesInsert<"pets">;

// Pet data interface based on database schema
export type PetData = Partial<Omit<PetInsert, "user_id" | "created_at" | "id">>;

interface OnboardingContextType {
  petData: PetData | null;
  updatePetData: (data: Partial<PetData>) => void;
  resetOnboarding: () => void;
  isOnboardingComplete: boolean;
  completeOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [petData, setPetData] = useState<PetData>({});
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  const updatePetData = (data: Partial<PetData>) => {
    setPetData((prev) => ({ ...(prev || {}), ...data }));
  };

  const completeOnboarding = useCallback(() => {
    setIsOnboardingComplete(true);
  }, []);

  const resetOnboarding = useCallback(() => {
    setIsOnboardingComplete(false);
    setPetData({});
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        petData,
        updatePetData,
        resetOnboarding,
        isOnboardingComplete,
        completeOnboarding,
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
