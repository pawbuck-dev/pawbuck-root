import { fetchMedicines } from "@/services/medicines";
import { getVaccinationsByPetId } from "@/services/vaccinations";
import {
  cancelAllNotifications as cancelAllNotificationsUtil,
  scheduleNotificationsForMedicine,
} from "@/utils/notifications/medicationNotificationScheduler";
import { scheduleNotificationForVaccination } from "@/utils/notifications/vaccinationNotificationScheduler";
import { useQueries } from "@tanstack/react-query";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert } from "react-native";
import { useAuth } from "./authContext";
import { usePets } from "./petsContext";
import { useUserPreferences } from "./userPreferencesContext";

interface NotificationsContextType {
  isScheduling: boolean;
  scheduleAllNotifications: () => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

export const NotificationsProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  const { user } = useAuth();
  const { pets } = usePets();
  const { preferences } = useUserPreferences();
  const [isScheduling, setIsScheduling] = useState(false);

  // Fetch medicines for all pets using React Query
  const medicinesQueries = useQueries({
    queries: pets.map((pet) => ({
      queryKey: ["medicines", pet.id],
      queryFn: () => fetchMedicines(pet.id),
      enabled: !!user && pets.length > 0,
    })),
  });

  // Fetch vaccinations for all pets using React Query
  const vaccinationsQueries = useQueries({
    queries: pets.map((pet) => ({
      queryKey: ["vaccinations", pet.id],
      queryFn: () => getVaccinationsByPetId(pet.id),
      enabled: !!user && pets.length > 0,
    })),
  });

  // Create stable data serialization keys for change detection
  const medicinesDataKey = medicinesQueries
    .map((q) => q.dataUpdatedAt)
    .join(",");
  const vaccinationsDataKey = vaccinationsQueries
    .map((q) => q.dataUpdatedAt)
    .join(",");

  // Create stable references for the query data
  const medicinesData = useMemo(
    () => medicinesQueries.map((q) => q.data),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [medicinesDataKey]
  );

  const vaccinationsData = useMemo(
    () => vaccinationsQueries.map((q) => q.data),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vaccinationsDataKey]
  );

  const reminderDays = preferences?.vaccination_reminder_days ?? 14;

  /**
   * Schedule notifications for all medicines and vaccinations
   */
  const scheduleAllNotifications = useCallback(async () => {
    if (!user || pets.length === 0) {
      return;
    }

    setIsScheduling(true);

    try {
      // Schedule medication notifications
      for (let i = 0; i < pets.length; i++) {
        const pet = pets[i];
        const medicines = medicinesData[i];

        if (medicines) {
          for (const medicine of medicines) {
            await scheduleNotificationsForMedicine(medicine, pet);
          }
        }
      }

      // Schedule vaccination notifications
      for (let i = 0; i < pets.length; i++) {
        const pet = pets[i];
        const vaccinations = vaccinationsData[i];

        if (vaccinations) {
          for (const vaccination of vaccinations) {
            await scheduleNotificationForVaccination(
              vaccination,
              pet,
              reminderDays
            );
          }
        }
      }

      Alert.alert("Notifications refreshed successfully");
    } catch (error) {
      console.error("Error scheduling notifications:", error);
    } finally {
      setIsScheduling(false);
    }
  }, [user, pets, medicinesData, vaccinationsData, reminderDays]);

  /**
   * Cancel all scheduled notifications
   */
  const cancelAllNotifications = useCallback(async () => {
    try {
      await cancelAllNotificationsUtil();
      console.log("Successfully cancelled all notifications");
    } catch (error) {
      console.error("Error cancelling notifications:", error);
    }
  }, []);

  /**
   * Refresh notifications (cancel all and reschedule)
   */
  const refreshNotifications = useCallback(async () => {
    await cancelAllNotifications();
    await scheduleAllNotifications();
  }, [cancelAllNotifications, scheduleAllNotifications]);

  const allMedicinesLoaded = medicinesQueries.every((q) => q.isSuccess);
  const allVaccinationsLoaded = vaccinationsQueries.every((q) => q.isSuccess);

  /**
   * Schedule notifications when user logs in or data changes
   * Cancel notifications when user logs out
   */
  useEffect(() => {
    if (
      user &&
      pets.length > 0 &&
      allMedicinesLoaded &&
      allVaccinationsLoaded
    ) {
      refreshNotifications();
    } else if (!user || pets.length === 0) {
      cancelAllNotifications();
    }
  }, [
    allMedicinesLoaded,
    allVaccinationsLoaded,
    user?.id,
    pets.length,
    user,
    refreshNotifications,
    cancelAllNotifications,
  ]); // Intentionally not including refreshNotifications and cancelAllNotifications to avoid infinite loop

  return (
    <NotificationsContext.Provider
      value={{
        isScheduling,
        scheduleAllNotifications,
        cancelAllNotifications,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }
  return context;
};
