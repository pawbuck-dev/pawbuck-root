import { supabase } from "@/utils/supabase";
import { isRlsAccessDeniedError, isSessionExpiredLikeError } from "@/utils/supabaseAuthErrors";
import { Alert } from "react-native";

/**
 * Maps Supabase / PostgREST failures from pet CRUD to user-visible alerts.
 * Session-like errors sign out so `onAuthStateChange` can route to login.
 */
export function handlePetDataPlaneError(err: unknown): void {
  if (isSessionExpiredLikeError(err)) {
    Alert.alert("Session expired", "Please sign in again to continue.", [
      { text: "OK", onPress: () => void supabase.auth.signOut() },
    ]);
    return;
  }
  if (isRlsAccessDeniedError(err)) {
    Alert.alert(
      "Access denied",
      "You do not have permission to view or change this pet."
    );
  }
}
