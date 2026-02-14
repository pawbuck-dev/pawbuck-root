import { Tables } from "@/database.types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePets } from "./petsContext";

// Pet type from database
export type Pet = Tables<"pets">;

const STORAGE_KEY = "@selected_pet_id";

interface SelectedPetContextType {
  /** The currently selected pet ID */
  selectedPetId: string | null;
  /** The selected pet's data (null if no pet selected or pet not found) */
  selectedPet: Pet | null;
  /** @deprecated Use selectedPet instead. Alias for backward compatibility */
  pet: Pet | null;
  /** Function to update the selected pet (only works in global mode) */
  setSelectedPetId: (petId: string | null) => void;
  /** Whether the context is still loading the persisted value */
  isLoading: boolean;
}

const SelectedPetContext = createContext<SelectedPetContextType | undefined>(
  undefined
);

interface SelectedPetProviderProps {
  children: ReactNode;
  /** Optional: If provided, uses this specific pet ID instead of global persisted state */
  petId?: string;
}

export const SelectedPetProvider: React.FC<SelectedPetProviderProps> = ({
  children,
  petId: propPetId,
}) => {
  const { pets, loadingPets } = usePets();
  const [globalSelectedPetId, setGlobalSelectedPetIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!propPetId); // Not loading if petId prop is provided
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(!!propPetId);

  // Determine if we're in "local mode" (petId prop provided) or "global mode"
  const isLocalMode = propPetId !== undefined;
  const effectiveSelectedPetId = isLocalMode ? propPetId : globalSelectedPetId;

  // Load persisted pet ID from AsyncStorage on mount (only in global mode)
  useEffect(() => {
    if (isLocalMode) return; // Skip in local mode

    const loadPersistedPetId = async () => {
      try {
        const storedPetId = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedPetId) {
          setGlobalSelectedPetIdState(storedPetId);
        }
      } catch (error) {
        console.error("Error loading persisted pet ID:", error);
      } finally {
        setHasLoadedFromStorage(true);
        setIsLoading(false);
      }
    };

    loadPersistedPetId();
  }, [isLocalMode]);

  // Auto-select first pet when (only in global mode):
  // 1. Pets have loaded
  // 2. We've checked AsyncStorage
  // 3. No pet is currently selected OR the selected pet no longer exists
  useEffect(() => {
    if (isLocalMode) return; // Skip in local mode
    if (loadingPets || !hasLoadedFromStorage) return;

    if (pets.length > 0) {
      const currentPetExists = pets.some((p) => p.id === globalSelectedPetId);

      if (!globalSelectedPetId || !currentPetExists) {
        // Select the first pet
        setGlobalSelectedPetIdState(pets[0].id);
        // Persist the selection
        AsyncStorage.setItem(STORAGE_KEY, pets[0].id).catch((error) =>
          console.error("Error persisting pet ID:", error)
        );
      }
    } else {
      // No pets available, clear selection
      if (globalSelectedPetId) {
        setGlobalSelectedPetIdState(null);
        AsyncStorage.removeItem(STORAGE_KEY).catch((error) =>
          console.error("Error clearing persisted pet ID:", error)
        );
      }
    }
  }, [pets, loadingPets, hasLoadedFromStorage, globalSelectedPetId, isLocalMode]);

  // Function to update selected pet and persist to storage (only works in global mode)
  const setSelectedPetId = useCallback(
    (petId: string | null) => {
      if (isLocalMode) {
        console.warn("setSelectedPetId called in local mode - this has no effect");
        return;
      }

      setGlobalSelectedPetIdState(petId);

      if (petId) {
        AsyncStorage.setItem(STORAGE_KEY, petId).catch((error) =>
          console.error("Error persisting pet ID:", error)
        );
      } else {
        AsyncStorage.removeItem(STORAGE_KEY).catch((error) =>
          console.error("Error clearing persisted pet ID:", error)
        );
      }
    },
    [isLocalMode]
  );

  // Derive the selected pet from the pets array
  const selectedPet = pets.find((p) => p.id === effectiveSelectedPetId) || null;

  return (
    <SelectedPetContext.Provider
      value={{
        selectedPetId: effectiveSelectedPetId,
        selectedPet,
        pet: selectedPet, // Backward compatibility alias
        setSelectedPetId,
        isLoading,
      }}
    >
      {children}
    </SelectedPetContext.Provider>
  );
};

export const useSelectedPet = () => {
  const context = useContext(SelectedPetContext);
  if (context === undefined) {
    throw new Error(
      "useSelectedPet must be used within a SelectedPetProvider"
    );
  }
  return context;
};
