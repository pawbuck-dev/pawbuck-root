/**
 * User Context for managing user-specific data (pets)
 *
 * This context provides:
 * - User's pets data (managed via usePets hook)
 * - Loading and error states for pet operations
 * - Methods to refresh and add pets
 *
 * Note: This context depends on AuthContext for user authentication state.
 * Make sure to wrap your app with AuthProvider before UserProvider.
 *
 * Usage example:
 * ```tsx
 * import { useUser } from "@/context/userContext";
 * import { useAuth } from "@/context/authContext";
 *
 * function MyComponent() {
 *   const { user } = useAuth();
 *   const { pets, loading, refreshPets, addPet } = useUser();
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

import { useAuth } from "@/context/authContext";
import { usePets, type Pet } from "@/hooks/usePets";
import { createPet } from "@/services/pets";
import React, { createContext, ReactNode, useContext } from "react";

// Re-export Pet type for convenience
export type { Pet };

interface UserContextType {
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
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Get authenticated user from AuthContext
  const { user } = useAuth();

  // Use the custom usePets hook for pet management
  const { pets, loading, error, refreshPets, addPet } = usePets(
    user?.id || null
  );

  return (
    <UserContext.Provider
      value={{
        pets,
        loading,
        error,
        refreshPets,
        addPet,
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
