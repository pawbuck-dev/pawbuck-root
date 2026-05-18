import { Tables } from "@/database.types";
import { MedicineData, MedicineFormData } from "@/types/medication";
import {
  addMedicine,
  deleteMedicine,
  fetchMedicines,
  updateMedicine,
} from "@/services/medicines";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDataMutationFeedback } from "@/hooks/useDataMutationFeedback";
import React, { createContext, ReactNode, useContext } from "react";
import { useNotifications } from "./notificationsContext";
import { useSelectedPet } from "./selectedPetContext";

interface MedicinesContextType {
  medicines: MedicineData[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  updateMedicineMutation: ReturnType<
    typeof useMutation<void, Error, MedicineFormData>
  >;
  addMedicinesMutation: ReturnType<
    typeof useMutation<Tables<"medicines">[], Error, MedicineFormData[]>
  >;
  deleteMedicineMutation: ReturnType<typeof useMutation<void, Error, string>>;
}

const MedicinesContext = createContext<MedicinesContextType | undefined>(
  undefined
);

export const MedicinesProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { pet } = useSelectedPet();
  const petId = pet?.id ?? "";
  const queryClient = useQueryClient();
  const { refreshNotifications } = useNotifications();
  const { handleMutationError } = useDataMutationFeedback();

  const {
    data: medicines = [],
    isLoading,
    error,
    refetch,
  } = useQuery<MedicineData[], Error>({
    queryKey: ["medicines", petId],
    queryFn: () => fetchMedicines(petId),
    enabled: !!petId,
  });

  const addMedicinesMutation = useMutation<
    Tables<"medicines">[],
    Error,
    MedicineFormData[]
  >({
    mutationFn: async (medicines) => {
      const insertedMedicines = await Promise.all(
        medicines.map(async (medicine) => {
          return addMedicine(medicine);
        })
      );
      return insertedMedicines;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["medicines", petId] });
      refreshNotifications();
    },
    onError: (error) => {
      handleMutationError(error, "Failed to add medicine");
    },
  });

  const updateMedicineMutation = useMutation<void, Error, MedicineFormData>({
    mutationFn: (medicine) => {
      return updateMedicine(medicine);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines", petId] });
      refreshNotifications();
    },

    onError: (error) => {
      handleMutationError(error, "Failed to update medicine");
    },
  });

  const deleteMedicineMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteMedicine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines", petId] });
      refreshNotifications();
    },
  });

  return (
    <MedicinesContext.Provider
      value={{
        medicines,
        isLoading,
        error,
        refetch,
        addMedicinesMutation,
        updateMedicineMutation,
        deleteMedicineMutation,
      }}
    >
      {children}
    </MedicinesContext.Provider>
  );
};

export const useMedicines = () => {
  const context = useContext(MedicinesContext);
  if (context === undefined) {
    throw new Error("useMedicines must be used within a MedicinesProvider");
  }
  return context;
};
