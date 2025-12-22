import { MedicationSchedule } from "@/models/medication";
import { fetchAllUserSchedules } from "@/services/medicationSchedules";
import { useQuery } from "@tanstack/react-query";
import React, { createContext, ReactNode, useContext } from "react";
import { useAuth } from "./authContext";

export type MedicineSchedulesMap = Record<string, MedicationSchedule>;

interface MedicineSchedulesContextType {
  /** Map of medication ID to its schedules */
  schedulesMap: MedicineSchedulesMap;
  /** Loading state for schedules */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch all schedules */
  refetch: () => void;
}

const MedicineSchedulesContext = createContext<
  MedicineSchedulesContextType | undefined
>(undefined);

export const MedicineSchedulesProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();

  const {
    data: schedulesMap = {},
    isLoading,
    error,
    refetch,
  } = useQuery<MedicineSchedulesMap, Error>({
    queryKey: ["medicineSchedules", user?.id],
    queryFn: () => fetchAllUserSchedules(user!.id),
    enabled: !!user?.id,
  });

  return (
    <MedicineSchedulesContext.Provider
      value={{
        schedulesMap,
        isLoading,
        error,
        refetch,
      }}
    >
      {children}
    </MedicineSchedulesContext.Provider>
  );
};

export const useMedicineSchedules = () => {
  const context = useContext(MedicineSchedulesContext);
  if (context === undefined) {
    throw new Error(
      "useMedicineSchedules must be used within a MedicineSchedulesProvider"
    );
  }
  return context;
};

/**
 * Hook to get schedules for a specific medication
 * @param medicationId - The medication ID
 * @returns The medication's schedules or an empty array if not found
 */
export const useSchedulesForMedication = (medicationId: string) => {
  const { schedulesMap, isLoading, error } = useMedicineSchedules();
  return {
    schedules: schedulesMap[medicationId] || [],
    isLoading,
    error,
  };
};
