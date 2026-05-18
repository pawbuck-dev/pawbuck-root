import {
  formatClinicalMutationError,
  type ClinicalMutationErrorPresentation,
} from "@/utils/clinicalMutationErrors";
import { supabase } from "@/utils/supabase";
import { useCallback } from "react";
import { Alert } from "react-native";

export function useDataMutationFeedback() {
  const showError = useCallback((title: string, message?: string) => {
    Alert.alert(title, message ?? "Please try again.");
  }, []);

  const showDuplicate = useCallback((entity: "vaccination" | "medication", message?: string) => {
    const title = entity === "vaccination" ? "Duplicate vaccination" : "Duplicate medication";
    Alert.alert(title, message ?? "This record already exists for this pet.");
  }, []);

  const handleMutationError = useCallback(
    (err: unknown, fallbackTitle = "Error") => {
      const formatted = formatClinicalMutationError(err);
      if (formatted.isSessionExpired) {
        Alert.alert(formatted.title, formatted.message, [
          { text: "OK", onPress: () => void supabase.auth.signOut() },
        ]);
        return formatted;
      }
      Alert.alert(formatted.isDuplicate ? formatted.title : fallbackTitle, formatted.message);
      return formatted;
    },
    []
  );

  return {
    showError,
    showDuplicate,
    handleMutationError,
    formatClinicalMutationError,
  } satisfies {
    showError: (title: string, message?: string) => void;
    showDuplicate: (entity: "vaccination" | "medication", message?: string) => void;
    handleMutationError: (
      err: unknown,
      fallbackTitle?: string
    ) => ClinicalMutationErrorPresentation;
    formatClinicalMutationError: typeof formatClinicalMutationError;
  };
}
