/**
 * User Context for managing authenticated user state and their pets
 *
 * This context provides:
 * - Current authenticated user
 * - User's pets data
 * - Loading and error states
 * - Methods to refresh and add pets
 *
 * Usage example:
 * ```tsx
 * import { useUser } from "@/context/userContext";
 *
 * function MyComponent() {
 *   const { user, pets, loading, refreshPets, addPet } = useUser();
 *
 *   if (loading) return <ActivityIndicator />;
 *
 *   return (
 *     <View>
 *       <Text>Welcome {user?.email}</Text>
 *       <Text>You have {pets.length} pets</Text>
 *     </View>
 *   );
 * }
 * ```
 */

import { Tables } from "@/database.types";
import { createPet, getPets } from "@/services/pets";
import { supabase } from "@/utils/supabase";
import { User } from "@supabase/supabase-js";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

// Pet type from database
export type Pet = Tables<"pets">;

interface UserContextType {
  /** Currently authenticated user, null if not authenticated */
  user: User | null;
  /** Array of pets belonging to the authenticated user */
  pets: Pet[];
  /** Loading state for initial auth and pet data fetch */
  loading: boolean;
  /** Error message if any operation fails */
  error: string | null;
  /** Refresh pets data from the database */
  refreshPets: () => Promise<void>;
  /** Add a new pet to the database and local state */
  addPet: (petData: Parameters<typeof createPet>[0]) => Promise<Pet>;
  /** Convenience flag for checking authentication status */
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch pets from the database
  const fetchPets = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedPets = await getPets();
      setPets(fetchedPets || []);
    } catch (err) {
      console.error("Error fetching pets:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch pets");
    } finally {
      setLoading(false);
    }
  };

  // Refresh pets data
  const refreshPets = async () => {
    if (user) {
      await fetchPets();
    }
  };

  // Add a new pet
  const addPet = async (
    petData: Parameters<typeof createPet>[0]
  ): Promise<Pet> => {
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
  };

  // Initialize user and set up auth state listener
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
          setPets([]);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error initializing auth:", err);
        setError(err instanceof Error ? err.message : "Authentication error");
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);

      if (!session?.user) {
        // Clear pets data when user logs out
        setPets([]);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch pets when user changes
  useEffect(() => {
    if (user) {
      fetchPets();
    } else {
      setLoading(false);
    }
  }, [user]);

  return (
    <UserContext.Provider
      value={{
        user,
        pets,
        loading,
        error,
        refreshPets,
        addPet,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
