import { Tables } from "@/database.types";
import { createPet, getPets } from "@/services/pets";
import { useCallback, useEffect, useState } from "react";

// Pet type from database
export type Pet = Tables<"pets">;

interface UsePetsReturn {
  /** Array of pets */
  pets: Pet[];
  /** Loading state for pet operations */
  loading: boolean;
  /** Error message if any operation fails */
  error: string | null;
  /** Fetch/refresh pets data from the database */
  refreshPets: () => Promise<void>;
  /** Add a new pet to the database and local state */
  addPet: (petData: Parameters<typeof createPet>[0]) => Promise<Pet>;
  /** Clear all pets from local state */
  clearPets: () => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
}

/**
 * Custom hook to manage pets data
 * @param userId - The user ID to fetch pets for. If null, no pets will be fetched.
 * @param autoFetch - Whether to automatically fetch pets when userId changes. Default: true
 */
export function usePets(
  userId: string | null,
  autoFetch: boolean = true
): UsePetsReturn {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch pets from the database
  const fetchPets = useCallback(async () => {
    if (!userId) {
      setPets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const fetchedPets = await getPets();
      setPets(fetchedPets || []);
    } catch (err) {
      console.error("Error fetching pets:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch pets");
      setPets([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Refresh pets data
  const refreshPets = useCallback(async () => {
    if (userId) {
      await fetchPets();
    }
  }, [userId, fetchPets]);

  // Add a new pet
  const addPet = useCallback(
    async (petData: Parameters<typeof createPet>[0]): Promise<Pet> => {
      try {
        setError(null);
        const newPet = await createPet(petData);
        setPets((prevPets) => [...prevPets, newPet]);
        return newPet;
      } catch (err) {
        console.error("Error adding pet:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to add pet";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  // Clear pets from local state
  const clearPets = useCallback(() => {
    setPets([]);
    setError(null);
  }, []);

  // Auto-fetch pets when userId changes
  useEffect(() => {
    if (autoFetch && userId) {
      fetchPets();
    } else if (!userId) {
      clearPets();
      setLoading(false);
    }
  }, [userId, autoFetch, fetchPets, clearPets]);

  return {
    pets,
    loading,
    error,
    refreshPets,
    addPet,
    clearPets,
    setLoading,
  };
}
