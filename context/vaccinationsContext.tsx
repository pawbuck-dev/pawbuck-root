import { Tables, TablesInsert } from "@/database.types";
import {
  createVaccination,
  getVaccinationsByPetId,
} from "@/services/vaccinations";
import {
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import React, { createContext, ReactNode, useContext } from "react";
import { useSelectedPet } from "./selectedPetContext";

interface VaccinationsContextType {
  /** Array of vaccinations for the current pet */
  vaccinations: Tables<"vaccinations">[];
  /** Loading state for vaccination data fetch */
  isLoading: boolean;
  /** Error message if any vaccination operation fails */
  error: string | null;
  /** Add a new vaccination to the database */
  addVaccinationMutation: UseMutationResult<
    Tables<"vaccinations">,
    Error,
    TablesInsert<"vaccinations">
  >;

  //   /** Upload vaccination document */
  //   uploadDocument: (documentUrl: string) => Promise<string>;
}

const VaccinationsContext = createContext<VaccinationsContextType | undefined>(
  undefined
);

export const VaccinationsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const { pet } = useSelectedPet();

  // Fetch vaccinations using React Query
  const {
    data: vaccinations = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["vaccinations", pet.id],
    queryFn: async () => {
      const fetchedVaccinations = await getVaccinationsByPetId(pet.id);
      return fetchedVaccinations || [];
    },
  });

  // Add vaccination mutation
  const addVaccinationMutation = useMutation({
    mutationFn: createVaccination,
    onSuccess: (newVaccination: Tables<"vaccinations">) => {
      // Optimistically update the cache
      queryClient.setQueryData<Tables<"vaccinations">[]>(
        ["vaccinations", pet.id],
        (old = []) => [newVaccination, ...old]
      );
    },
    onError: (err) => {
      console.error("Error adding vaccination:", err);
    },
  });

  // Upload document mutation
  //   const uploadDocumentMutation = useMutation({
  //     mutationFn: ({ fileUri, petId }: { fileUri: string; petId: string }) =>
  //       uploadVaccinationDocument(fileUri, petId),
  //     onError: (err) => {
  //       console.error("Error uploading document:", err);
  //     },
  //   });

  //   const uploadDocument = useCallback(
  //     async (documentUrl: string): Promise<string> =>
  //       uploadDocumentMutation.mutateAsync({ documentUrl, petId: pet.id }),
  //     [uploadDocumentMutation]
  //   );

  const error =
    queryError?.message ||
    addVaccinationMutation.error?.message ||
    // uploadDocumentMutation.error?.message ||
    null;

  return (
    <VaccinationsContext.Provider
      value={{
        vaccinations,
        isLoading,
        error,
        addVaccinationMutation,
        // uploadDocument,
      }}
    >
      {children}
    </VaccinationsContext.Provider>
  );
};

export const useVaccinations = () => {
  const context = useContext(VaccinationsContext);
  if (context === undefined) {
    throw new Error(
      "useVaccinations must be used within a VaccinationsProvider"
    );
  }
  return context;
};
