import { Tables, TablesInsert, TablesUpdate } from "@/database.types";
import {
  createClinicalExam,
  deleteClinicalExam,
  fetchClinicalExams,
  updateClinicalExam,
} from "@/services/clinicalExams";
import {
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import React, { createContext, ReactNode, useContext } from "react";
import { useSelectedPet } from "./selectedPetContext";

interface ClinicalExamsContextType {
  /** Array of clinical exams for the current pet */
  clinicalExams: Tables<"clinical_exams">[];
  /** Loading state for clinical exam data fetch */
  isLoading: boolean;
  /** Error message if any clinical exam operation fails */
  error: string | null;
  /** Add a new clinical exam to the database */
  addClinicalExamMutation: UseMutationResult<
    Tables<"clinical_exams">,
    Error,
    TablesInsert<"clinical_exams">
  >;
  /** Update an existing clinical exam */
  updateClinicalExamMutation: UseMutationResult<
    Tables<"clinical_exams">,
    Error,
    { id: string; data: TablesUpdate<"clinical_exams"> }
  >;
  /** Delete a clinical exam */
  deleteClinicalExamMutation: UseMutationResult<void, Error, string>;
}

const ClinicalExamsContext = createContext<ClinicalExamsContextType | undefined>(
  undefined
);

export const ClinicalExamsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const { pet } = useSelectedPet();

  // Fetch clinical exams using React Query
  const {
    data: clinicalExams = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["clinicalExams", pet.id],
    queryFn: async () => {
      const fetchedExams = await fetchClinicalExams(pet.id);
      return fetchedExams || [];
    },
  });

  // Add clinical exam mutation
  const addClinicalExamMutation = useMutation({
    mutationFn: createClinicalExam,
    onSuccess: (newExam: Tables<"clinical_exams">) => {
      // Optimistically update the cache
      queryClient.setQueryData<Tables<"clinical_exams">[]>(
        ["clinicalExams", pet.id],
        (old = []) => [newExam, ...old]
      );
    },
    onError: (err) => {
      console.error("Error adding clinical exam:", err);
    },
  });

  // Update clinical exam mutation
  const updateClinicalExamMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TablesUpdate<"clinical_exams"> }) =>
      updateClinicalExam(id, data),
    onSuccess: (updatedExam: Tables<"clinical_exams">) => {
      // Optimistically update the cache
      queryClient.setQueryData<Tables<"clinical_exams">[]>(
        ["clinicalExams", pet.id],
        (old = []) =>
          old.map((e) => (e.id === updatedExam.id ? updatedExam : e))
      );
    },
    onError: (err) => {
      console.error("Error updating clinical exam:", err);
    },
  });

  // Delete clinical exam mutation
  const deleteClinicalExamMutation = useMutation({
    mutationFn: deleteClinicalExam,
    onSuccess: (_, deletedId) => {
      // Optimistically update the cache
      queryClient.setQueryData<Tables<"clinical_exams">[]>(
        ["clinicalExams", pet.id],
        (old = []) => old.filter((e) => e.id !== deletedId)
      );
    },
    onError: (err) => {
      console.error("Error deleting clinical exam:", err);
    },
  });

  const error =
    queryError?.message ||
    addClinicalExamMutation.error?.message ||
    updateClinicalExamMutation.error?.message ||
    deleteClinicalExamMutation.error?.message ||
    null;

  return (
    <ClinicalExamsContext.Provider
      value={{
        clinicalExams,
        isLoading,
        error,
        addClinicalExamMutation,
        updateClinicalExamMutation,
        deleteClinicalExamMutation,
      }}
    >
      {children}
    </ClinicalExamsContext.Provider>
  );
};

export const useClinicalExams = () => {
  const context = useContext(ClinicalExamsContext);
  if (context === undefined) {
    throw new Error(
      "useClinicalExams must be used within a ClinicalExamsProvider"
    );
  }
  return context;
};
