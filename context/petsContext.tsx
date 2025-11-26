import { useAuth } from "@/context/authContext";
import { usePets as usePetsHook, type Pet } from "@/hooks/usePets";
import { createPet } from "@/services/pets";
import React, { createContext, ReactNode, useContext } from "react";

// Re-export Pet type for convenience
export type { Pet };

interface PetsContextType {
  /** Array of pets belonging to the authenticated user */
  pets: Pet[];
  /** Loading state for pet data fetch */
  loading: boolean;
  /** Error message if any pet operation fails */
  error: string | null;
  /** Refresh pets data from the database */
  refreshPets: () => Promise<void>;
  /** Add a new pet to the database and local state */
  addPet: (petData: Parameters<typeof createPet>[0]) => Promise<Pet>;
  /** Sync pet data from params (onboarding/signup flow) */
  syncPetFromParams: (
    petDataParam: string | string[] | undefined,
    clearParams: () => void
  ) => Promise<void>;
}

const PetsContext = createContext<PetsContextType | undefined>(undefined);

export const PetsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Get authenticated user from AuthContext
  const { user } = useAuth();

  // Use the custom usePets hook for pet management
  const { pets, loading, error, refreshPets, addPet } = usePetsHook(
    user?.id || null
  );

  // Sync pet data from params (onboarding/signup flow)
  const syncPetFromParams = async (
    petDataParam: string | string[] | undefined,
    clearParams: () => void
  ) => {
    if (petDataParam && typeof petDataParam === "string" && user) {
      try {
        const petData = JSON.parse(petDataParam);
        await addPet(petData);
        console.log("Pet synced successfully from params");
        // Clear the params to prevent re-adding on navigation
        clearParams();
      } catch (error) {
        console.error("Error syncing pet from params:", error);
        throw error;
      }
    }
  };

  return (
    <PetsContext.Provider
      value={{
        pets,
        loading,
        error,
        refreshPets,
        addPet,
        syncPetFromParams,
      }}
    >
      {children}
    </PetsContext.Provider>
  );
};

export const usePets = () => {
  const context = useContext(PetsContext);
  if (context === undefined) {
    throw new Error("usePets must be used within a PetsProvider");
  }
  return context;
};
