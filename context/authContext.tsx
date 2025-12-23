import { useNotificationHandlers } from "@/hooks/useNotificationHandler";
import { supabase } from "@/utils/supabase";
import { User } from "@supabase/supabase-js";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthContextType {
  /** Currently authenticated user, null if not authenticated */
  user: User | null;
  /** Loading state for authentication operations */
  loading: boolean;
  /** Error message if any operation fails */
  error: string | null;
  /** Convenience flag for checking authentication status */
  isAuthenticated: boolean;
  /** Sign out the current user */
  signOut: () => Promise<void>;
  /** Clear any authentication errors */
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sign out the current user
  const signOut = useCallback(async () => {
    try {
      setError(null);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (err) {
      console.error("Error signing out:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to sign out";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Clear authentication errors
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const { deviceId, pushToken } = useNotificationHandlers();

  // Initialize authentication state
  useEffect(() => {
    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);

      // Clear loading state when auth state changes
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const updatePushToken = async () => {
      if (pushToken && deviceId && user) {
        const { error } = await supabase.from("push_tokens").upsert(
          {
            device_id: deviceId,
            token: pushToken,
            user_id: user.id,
          },
          {
            onConflict: "device_id, user_id",
          }
        );

        if (error) {
          console.error("Error updating push token:", error);
        }
      }
    };

    updatePushToken();
  }, [pushToken, deviceId, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
