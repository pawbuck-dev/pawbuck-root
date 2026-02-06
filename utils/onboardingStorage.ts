import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  EMAIL_ONBOARDING_SHOWN: "@pawbuck:email_onboarding_shown",
  HEALTH_RECORDS_TOOLTIP_SHOWN: "@pawbuck:health_records_tooltip_shown",
  PET_PASSPORT_ONBOARDING_SHOWN: "@pawbuck:pet_passport_onboarding_shown",
  MESSAGES_ONBOARDING_SHOWN: "@pawbuck:messages_onboarding_shown",
} as const;

/**
 * Check if user has seen the email onboarding modal
 */
export const hasSeenEmailOnboarding = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.EMAIL_ONBOARDING_SHOWN);
    return value === "true";
  } catch (error) {
    console.error("Error checking email onboarding status:", error);
    return false;
  }
};

/**
 * Mark email onboarding as seen
 */
export const markEmailOnboardingSeen = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.EMAIL_ONBOARDING_SHOWN, "true");
  } catch (error) {
    console.error("Error marking email onboarding as seen:", error);
  }
};

/**
 * Check if user has seen the health records tooltip
 */
export const hasSeenHealthRecordsTooltip = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.HEALTH_RECORDS_TOOLTIP_SHOWN);
    return value === "true";
  } catch (error) {
    console.error("Error checking health records tooltip status:", error);
    return false;
  }
};

/**
 * Mark health records tooltip as seen
 */
export const markHealthRecordsTooltipSeen = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.HEALTH_RECORDS_TOOLTIP_SHOWN, "true");
  } catch (error) {
    console.error("Error marking health records tooltip as seen:", error);
  }
};

/**
 * Check if user has seen the pet passport onboarding modal
 */
export const hasSeenPetPassportOnboarding = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.PET_PASSPORT_ONBOARDING_SHOWN);
    return value === "true";
  } catch (error) {
    console.error("Error checking pet passport onboarding status:", error);
    return false;
  }
};

/**
 * Mark pet passport onboarding as seen
 */
export const markPetPassportOnboardingSeen = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PET_PASSPORT_ONBOARDING_SHOWN, "true");
  } catch (error) {
    console.error("Error marking pet passport onboarding as seen:", error);
  }
};

/**
 * Check if user has seen the messages onboarding modal
 */
export const hasSeenMessagesOnboarding = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES_ONBOARDING_SHOWN);
    return value === "true";
  } catch (error) {
    console.error("Error checking messages onboarding status:", error);
    return false;
  }
};

/**
 * Mark messages onboarding as seen
 */
export const markMessagesOnboardingSeen = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES_ONBOARDING_SHOWN, "true");
  } catch (error) {
    console.error("Error marking messages onboarding as seen:", error);
  }
};

/**
 * Reset all onboarding flags (for testing/re-showing)
 */
export const resetOnboardingFlags = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.EMAIL_ONBOARDING_SHOWN,
      STORAGE_KEYS.HEALTH_RECORDS_TOOLTIP_SHOWN,
      STORAGE_KEYS.PET_PASSPORT_ONBOARDING_SHOWN,
      STORAGE_KEYS.MESSAGES_ONBOARDING_SHOWN,
    ]);
  } catch (error) {
    console.error("Error resetting onboarding flags:", error);
  }
};
