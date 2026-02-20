import {
    deleteLabResult,
    fetchLabResults,
    LabResult,
    updateLabResult,
} from "@/services/labResults";
import { useMutation, UseMutationResult, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { createContext, ReactNode, useContext } from "react";
import { Alert } from "react-native";
import { useSelectedPet } from "./selectedPetContext";

interface LabResultsContextType {
  labResults: LabResult[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  updateLabResultMutation: UseMutationResult<
    LabResult,
    Error,
    { id: string; updates: Partial<LabResult> },
    unknown
  >;
  deleteLabResultMutation: UseMutationResult<void, Error, string, unknown>;
}

const LabResultsContext = createContext<LabResultsContextType | undefined>(
  undefined
);

export function LabResultsProvider({ children }: { children: ReactNode }) {
  const { pet } = useSelectedPet();
  const queryClient = useQueryClient();

  const {
    data: labResults = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["labResults", pet?.id],
    queryFn: () => fetchLabResults(pet!.id),
    enabled: !!pet?.id,
  });

  const updateLabResultMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<LabResult> }) =>
      updateLabResult(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labResults", pet?.id] });
      Alert.alert("Success", "Lab result updated successfully");
    },
    onError: (error: Error) => {
      Alert.alert("Error", "Failed to update lab result");
      console.error("Update lab result error:", error);
    },
  });

  const deleteLabResultMutation = useMutation({
    mutationFn: (id: string) => deleteLabResult(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labResults", pet?.id] });
      Alert.alert("Success", "Lab result deleted successfully");
    },
    onError: (error: Error) => {
      Alert.alert("Error", "Failed to delete lab result");
      console.error("Delete lab result error:", error);
    },
  });

  return (
    <LabResultsContext.Provider
      value={{
        labResults,
        isLoading,
        error: error as Error | null,
        refetch,
        updateLabResultMutation,
        deleteLabResultMutation,
      }}
    >
      {children}
    </LabResultsContext.Provider>
  );
}

export function useLabResults() {
  const context = useContext(LabResultsContext);
  if (context === undefined) {
    throw new Error("useLabResults must be used within a LabResultsProvider");
  }
  return context;
}

