import { useAuth } from "@/context/authContext";
import { Tables, TablesUpdate } from "@/database.types";
import {
  getUserPreferences,
  upsertUserPreferences,
} from "@/services/userPreferences";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
} from "react";

// User preferences type from database
export type UserPreferences = Tables<"user_preferences">;

interface UserPreferencesContextType {
  /** User preferences data */
  preferences: UserPreferences | null;
  /** Loading state for preferences data fetch */
  loadingPreferences: boolean;
  /** Error message if any operation fails */
  error: string | null;
  /** Update user preferences (upsert) */
  updatePreferences: (
    preferences: Partial<TablesUpdate<"user_preferences">>
  ) => Promise<UserPreferences>;
  /** Loading state for preferences update */
  updatingPreferences: boolean;
}

const UserPreferencesContext = createContext<
  UserPreferencesContextType | undefined
>(undefined);

export const UserPreferencesProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Get authenticated user from AuthContext
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id || null;

  // Fetch user preferences using React Query
  const {
    data: preferences = null,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["userPreferences", userId],
    queryFn: async () => {
      if (!userId) return null;
      const fetchedPreferences = await getUserPreferences(userId);
      return fetchedPreferences || null;
    },
    enabled: !!userId,
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (
      preferencesData: Partial<TablesUpdate<"user_preferences">>
    ) => {
      if (!userId) throw new Error("User not authenticated");
      return upsertUserPreferences(userId, preferencesData);
    },
    onSuccess: (updatedPreferences) => {
      // Optimistically update the cache
      queryClient.setQueryData(["userPreferences", userId], updatedPreferences);
    },
    onError: (err) => {
      console.error("Error updating preferences:", err);
    },
  });

  // Update preferences callback
  const updatePreferences = useCallback(
    async (
      preferencesData: Partial<TablesUpdate<"user_preferences">>
    ): Promise<UserPreferences> =>
      updatePreferencesMutation.mutateAsync(preferencesData),
    [updatePreferencesMutation]
  );

  const error =
    queryError?.message || updatePreferencesMutation.error?.message || null;

  return (
    <UserPreferencesContext.Provider
      value={{
        preferences,
        loadingPreferences: loading,
        error,
        updatePreferences,
        updatingPreferences: updatePreferencesMutation.isPending,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error(
      "useUserPreferences must be used within a UserPreferencesProvider"
    );
  }
  return context;
};
