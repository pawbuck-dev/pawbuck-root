import { useAuth } from "@/context/authContext";
import { Tables, TablesInsert } from "@/database.types";
import { createPet, getPets } from "@/services/pets";
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

  useEffect(() => {
    console.log("pets context mounted");

    return () => {
      console.log("pets context unmounted");
    };
  }, []);

  // Add a new pet
  const addPet = useCallback(
    async (petData: TablesInsert<"pets">): Promise<Pet> =>
      addPetMutation.mutateAsync(petData),
    [addPetMutation]
  );

  // Reset the sync tracker when onboarding is reset
  useEffect(() => {
    if (!isOnboardingComplete) {
      hasSyncedRef.current = false;
    }
  }, [isOnboardingComplete]);

  // Handle pet data from onboarding/signup using PetsContext
  useEffect(() => {
    // Guard: only sync if onboarding is complete and we haven't synced yet
    if (!isOnboardingComplete || hasSyncedRef.current) return;

    const handlePetData = async () => {
      hasSyncedRef.current = true;
      console.log("syncing pet data");
      try {
        // Call the mutation directly to avoid dependency issues
        await addPetMutation.mutateAsync(petData as Pet);
      } catch (error) {
        console.error("Error syncing pet:", error);
        Alert.alert(
          "Error",
          "There was an issue saving your pet's profile. Please try adding it again from the home page."
        );
      } finally {
        console.log("resetting onboarding");
        resetOnboarding();
      }
    };

    handlePetData();
  }, [isOnboardingComplete, addPetMutation, resetOnboarding, petData]);

  const error = queryError?.message || addPetMutation.error?.message || null;

  return (
    <PetsContext.Provider
      value={{
        pets,
        loadingPets: loading,
        addingPet: addPetMutation.isPending,
        error,
        addPet,
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
