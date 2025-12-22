import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@medication_notifications";

interface NotificationIdsMap {
  [medicineId: string]: string[];
}

/**
 * Save notification IDs for a specific medicine
 */
export const saveNotificationIds = async (
  medicineId: string,
  notificationIds: string[]
): Promise<void> => {
  try {
    const allIds = await getAllNotificationIds();
    allIds[medicineId] = notificationIds;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allIds));
  } catch (error) {
    console.error("Error saving notification IDs:", error);
    throw error;
  }
};

/**
 * Retrieve notification IDs for a specific medicine
 */
export const getNotificationIds = async (
  medicineId: string
): Promise<string[]> => {
  try {
    const allIds = await getAllNotificationIds();
    return allIds[medicineId] || [];
  } catch (error) {
    console.error("Error retrieving notification IDs:", error);
    return [];
  }
};

/**
 * Get all stored notification IDs
 */
export const getAllNotificationIds = async (): Promise<NotificationIdsMap> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("Error retrieving all notification IDs:", error);
    return {};
  }
};

/**
 * Remove notification IDs for a specific medicine
 */
export const clearNotificationIds = async (
  medicineId: string
): Promise<void> => {
  try {
    const allIds = await getAllNotificationIds();
    delete allIds[medicineId];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allIds));
  } catch (error) {
    console.error("Error clearing notification IDs:", error);
    throw error;
  }
};

/**
 * Remove all stored notification IDs
 */
export const clearAllNotificationIds = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing all notification IDs:", error);
    throw error;
  }
};

