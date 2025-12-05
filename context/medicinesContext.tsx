import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { createContext, useContext, ReactNode } from "react";
import { fetchMedicines, Medicine, deleteMedicine, updateMedicine } from "@/services/medicines";
import { useSelectedPet } from "./selectedPetContext";

interface MedicinesContextType {
  medicines: Medicine[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  updateMedicineMutation: ReturnType<typeof useMutation<void, Error, { id: string; data: Partial<Medicine> }>>;
  deleteMedicineMutation: ReturnType<typeof useMutation<void, Error, string>>;
}

const MedicinesContext = createContext<MedicinesContextType | undefined>(
  undefined
);

export const MedicinesProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { pet } = useSelectedPet();
  const queryClient = useQueryClient();

  const {
    data: medicines = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Medicine[], Error>({
    queryKey: ["medicines", pet.id],
    queryFn: () => fetchMedicines(pet.id),
    enabled: !!pet.id,
  });

  const updateMedicineMutation = useMutation<void, Error, { id: string; data: Partial<Medicine> }>({
    mutationFn: ({ id, data }) => updateMedicine(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines", pet.id] });
    },
  });

  const deleteMedicineMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteMedicine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines", pet.id] });
    },
  });

  return (
    <MedicinesContext.Provider
      value={{
        medicines,
        isLoading,
        error,
        refetch,
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

