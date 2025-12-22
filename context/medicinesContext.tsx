import { ScheduleFrequency } from "@/constants/schedules";
import { Tables } from "@/database.types";
import { MedicineData, MedicineFormData } from "@/models/medication";
import { updateMedicationSchedules } from "@/services/medicationSchedules";
import {
  addMedicine,
  deleteMedicine,
  fetchMedicines,
  updateMedicine,
} from "@/services/medicines";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { createContext, ReactNode, useContext, useMemo } from "react";
import { Alert } from "react-native";
import { useAuth } from "./authContext";
import { useMedicineSchedules } from "./medicineSchedulesContext";
import { useSelectedPet } from "./selectedPetContext";

interface MedicinesContextType {
  medicines: MedicineData[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  updateMedicineMutation: ReturnType<
    typeof useMutation<
      [void, void],
      Error,
      {
        id: string;
        data: MedicineFormData;
      }
    >
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { schedulesMap } = useMedicineSchedules();

  const {
    data: medicinesData = [],
    isLoading,
    error,
    refetch,
  } = useQuery<MedicineData[], Error>({
    queryKey: ["medicines", pet.id],
    queryFn: () => fetchMedicines(pet.id),
    enabled: !!pet.id,
  });

  // Enrich medicines with schedules from the schedules context
  const medicinesWithSchedules = useMemo(() => {
    const medicinesWithSchedules: MedicineData[] = medicinesData.map(
      (medicineData) => ({
        medicine: medicineData.medicine,
        schedule: schedulesMap[medicineData.medicine.id] || {
          type: ScheduleFrequency.AS_NEEDED,
          schedules: [],
        },
      })
    );

    return medicinesWithSchedules;
  }, [medicinesData, schedulesMap]);

  const addMedicinesMutation = useMutation<
    Tables<"medicines">[],
    Error,
    MedicineFormData[]
  >({
    mutationFn: async (medications) => {
      medications.map(async (medication) => {
        medication.medicine.pet_id = pet.id;
      });
      const insertedMedications = await Promise.all(
        medications.map(async (medication) => {
          const insertedMedicine = await addMedicine(medication.medicine);
          updateMedicationSchedules(insertedMedicine.id, medication.schedule);
          return insertedMedicine;
        })
      );
      return insertedMedications;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["medicineSchedules", user!.id],
      });
      queryClient.invalidateQueries({ queryKey: ["medicines", pet.id] });
    },
    onError: (error) => {
      console.error("Error adding medicine:", error);
      Alert.alert("Error", "Failed to add medicine");
    },
  });

  const updateMedicineMutation = useMutation<
    [void, void],
    Error,
    {
      id: string;
      data: MedicineFormData;
    }
  >({
    mutationFn: ({ id, data }) => {
      return Promise.all([
        updateMedicine(id, data.medicine),
        updateMedicationSchedules(id, data.schedule),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines", pet.id] });
      // Also invalidate schedules to refetch updated schedule data
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: ["medicineSchedules", user.id],
        });
      }
    },
    onError: (error) => {
      console.error("Error updating medicine:", error);
      Alert.alert("Error", "Failed to update medicine");
    },
  });

  const deleteMedicineMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteMedicine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines", pet.id] });
      // Also invalidate schedules to clean up deleted medicine's schedules
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: ["medicineSchedules", user.id],
        });
      }
    },
  });

  return (
    <MedicinesContext.Provider
      value={{
        medicines: medicinesWithSchedules,
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
