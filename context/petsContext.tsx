import { useAuth } from "@/context/authContext";
import { Tables, TablesInsert, TablesUpdate } from "@/database.types";
import { createPet, deletePet, getPets, updatePet } from "@/services/pets";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { Alert } from "react-native";
import { useOnboarding } from "./onboardingContext";

// Pet type from database
export type Pet = Tables<"pets">;

interface PetsContextType {
  /** Array of pets belonging to the authenticated user */
  pets: Pet[];
  /** Loading state for pet data fetch */
  loadingPets: boolean;
  /** Loading state for pet addition */
  addingPet: boolean;
  /** Error message if any pet operation fails */
  error: string | null;
  /** Add a new pet to the database and local state */
  addPet: typeof createPet;
  /** Update an existing pet */
  updatePet: (petId: string, petData: TablesUpdate<"pets">) => Promise<Pet>;
  /** Loading state for pet update */
  updatingPet: boolean;
  /** Delete a pet (soft delete) */
  deletePet: (petId: string) => Promise<void>;
  /** Loading state for pet deletion */
  deletingPet: boolean;
}

const PetsContext = createContext<PetsContextType | undefined>(undefined);

export const PetsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Get authenticated user from AuthContext
  const { user } = useAuth();
  const { isOnboardingComplete, petData, resetOnboarding } = useOnboarding();
  const queryClient = useQueryClient();
  const userId = user?.id || null;

  // Ref to track if we've already processed this onboarding session
  const hasSyncedRef = useRef(false);

  // Fetch pets using React Query
  const {
    data: pets = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["pets", userId],
    queryFn: async () => {
      if (!userId) return [];
      const fetchedPets = await getPets();
      return fetchedPets || [];
    },
    enabled: !!userId,
  });

  // Add pet mutation
  const addPetMutation = useMutation({
    mutationFn: createPet,
    onSuccess: (newPet) => {
      // Optimistically update the cache
      queryClient.setQueryData<Pet[]>(["pets", userId], (old = []) => [
        ...old,
        newPet,
      ]);
    },
    onError: (err) => {
      console.error("Error adding pet:", err);
    },
  });

  // Update pet mutation
  const updatePetMutation = useMutation({
    mutationFn: ({
      petId,
      petData,
    }: {
      petId: string;
      petData: TablesUpdate<"pets">;
    }) => updatePet(petId, petData),
    onSuccess: (updatedPet) => {
      // Optimistically update the cache
      queryClient.setQueryData<Pet[]>(["pets", userId], (old = []) =>
        old.map((pet) => (pet.id === updatedPet.id ? updatedPet : pet))
      );
    },
    onError: (err) => {
      console.error("Error updating pet:", err);
    },
  });

  // Delete pet mutation (soft delete)
  const deletePetMutation = useMutation({
    mutationFn: (petId: string) => deletePet(petId),
    onSuccess: (_, petId) => {
      // Remove the deleted pet from the cache
      queryClient.setQueryData<Pet[]>(["pets", userId], (old = []) =>
        old.filter((pet) => pet.id !== petId)
      );
    },
    onError: (err) => {
      console.error("Error deleting pet:", err);
    },
  });

  // Add a new pet
  const addPet = useCallback(
    async (petData: TablesInsert<"pets">): Promise<Pet> =>
      addPetMutation.mutateAsync(petData),
    [addPetMutation]
  );

  // Update an existing pet
  const updatePetCallback = useCallback(
    async (petId: string, petData: TablesUpdate<"pets">): Promise<Pet> =>
      updatePetMutation.mutateAsync({ petId, petData }),
    [updatePetMutation]
  );

  // Delete a pet (soft delete)
  const deletePetCallback = useCallback(
    async (petId: string): Promise<void> => {
      await deletePetMutation.mutateAsync(petId);
    },
    [deletePetMutation]
  );

  // Reset the sync tracker when onboarding is reset
  useEffect(() => {
    if (!isOnboardingComplete) {
      hasSyncedRef.current = false;
    }
  }, [isOnboardingComplete]);

  // Handle pet data from onboarding/signup using PetsContext
  useEffect(() => {
    // Guard: only sync if onboarding is complete, user is authenticated, 
    // we haven't synced yet, and no mutation is in progress
    if (
      !isOnboardingComplete ||
      !user ||
      hasSyncedRef.current ||
      addPetMutation.isPending
    ) {
      return;
    }

    // Set the ref synchronously to prevent race conditions from multiple effect runs
    hasSyncedRef.current = true;

    // Reset onboarding immediately to prevent re-triggering
    // (we've captured petData above, so this is safe)
    const petDataToSync = { ...petData };
    resetOnboarding();

    const handlePetData = async () => {
      try {
        // Call the mutation directly to avoid dependency issues
        await addPetMutation.mutateAsync(petDataToSync as Pet);
      } catch (error) {
        console.error("Error syncing pet:", error);
        Alert.alert(
          "Error",
          "There was an issue saving your pet's profile. Please try adding it again from the home page."
        );
      }
    };

    handlePetData();
  }, [isOnboardingComplete, user, addPetMutation, resetOnboarding, petData]);

  const error =
    queryError?.message ||
    addPetMutation.error?.message ||
    updatePetMutation.error?.message ||
    deletePetMutation.error?.message ||
    null;

  return (
    <PetsContext.Provider
      value={{
        pets,
        loadingPets: loading,
        addingPet: addPetMutation.isPending,
        error,
        addPet,
        updatePet: updatePetCallback,
        updatingPet: updatePetMutation.isPending,
        deletePet: deletePetCallback,
        deletingPet: deletePetMutation.isPending,
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
