import { MedicineData } from "@/models/medication";
import { fetchMedicines } from "@/services/medicines";
import {
  cancelAllNotifications as cancelAllNotificationsUtil,
  scheduleNotificationsForMedicine,
} from "@/utils/notifications/medicationNotificationScheduler";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Alert } from "react-native";
import { useAuth } from "./authContext";
import { usePets } from "./petsContext";

interface MedicationNotificationsContextType {
  isScheduling: boolean;
  scheduleAllNotifications: () => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const MedicationNotificationsContext = createContext<
  MedicationNotificationsContextType | undefined
>(undefined);

export const MedicationNotificationsProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  const { user } = useAuth();
  const { pets } = usePets();
  const [isScheduling, setIsScheduling] = useState(false);

  /**
   * Schedule notifications for all medicines across all pets
   */
  const scheduleAllNotifications = useCallback(async () => {
    if (!user || pets.length === 0) {
      return;
    }

    setIsScheduling(true);

    try {
      // Fetch medicines for all pets
      const allMedicinesPromises = pets.map((pet) => fetchMedicines(pet.id));
      const allMedicinesResults = await Promise.all(allMedicinesPromises);

      // Schedule notifications for each medicine
      for (let i = 0; i < pets.length; i++) {
        const pet = pets[i];
        const medicines: MedicineData[] = allMedicinesResults[i];

        for (const medicine of medicines) {
          await scheduleNotificationsForMedicine(medicine, pet);
        }
      }

      console.log("Successfully scheduled all medication notifications");
    } catch (error) {
      console.error("Error scheduling medication notifications:", error);
    } finally {
      setIsScheduling(false);
    }
    Alert.alert("Notifications refreshed successfully");
  }, [user, pets]);

  /**
   * Cancel all scheduled medication notifications
   */
  const cancelAllNotifications = useCallback(async () => {
    try {
      await cancelAllNotificationsUtil();
      console.log("Successfully cancelled all medication notifications");
    } catch (error) {
      console.error("Error cancelling medication notifications:", error);
    }
  }, []);

  /**
   * Refresh notifications (cancel all and reschedule)
   */
  const refreshNotifications = useCallback(async () => {
    await cancelAllNotifications();
    await scheduleAllNotifications();
  }, [cancelAllNotifications, scheduleAllNotifications]);

  /**
   * Schedule notifications when user logs in or pets change
   * Cancel notifications when user logs out
   */
  useEffect(() => {
    if (user && pets.length > 0) {
      refreshNotifications();
    }
    if (!user) {
      cancelAllNotifications();
    }
  }, [user, pets.length, refreshNotifications, cancelAllNotifications]);

  return (
    <MedicationNotificationsContext.Provider
      value={{
        isScheduling,
        scheduleAllNotifications,
        cancelAllNotifications,
        refreshNotifications,
      }}
    >
      {children}
    </MedicationNotificationsContext.Provider>
  );
};

export const useMedicationNotifications = () => {
  const context = useContext(MedicationNotificationsContext);
  if (context === undefined) {
    throw new Error(
      "useMedicationNotifications must be used within a MedicationNotificationsProvider"
    );
  }
  return context;
};

