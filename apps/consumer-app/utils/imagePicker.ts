import * as ImagePicker from "expo-image-picker";
import { Alert, Linking } from "react-native";

/**
 * Request camera permissions from the user
 * @returns {Promise<boolean>} True if permission granted, false otherwise
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  // First check current permission status
  const { status: currentStatus } =
    await ImagePicker.getCameraPermissionsAsync();

  // If already granted, return true
  if (currentStatus === "granted") {
    return true;
  }

  // If previously denied, show alert with Settings option
  if (currentStatus === "denied") {
    Alert.alert(
      "Permission Required",
      "Camera access was denied. Please enable it in Settings to take photos.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  // If undetermined, request permission
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    return false;
  }
  return true;
};

/**
 * Request media library permissions from the user
 * @returns {Promise<boolean>} True if permission granted, false otherwise
 */
export const requestLibraryPermission = async (): Promise<boolean> => {
  // First check current permission status
  const { status: currentStatus } =
    await ImagePicker.getMediaLibraryPermissionsAsync();

  // If already granted, return true
  if (currentStatus === "granted") {
    return true;
  }

  // If previously denied, show alert with Settings option
  if (currentStatus === "denied") {
    Alert.alert(
      "Permission Required",
      "Photo library access was denied. Please enable it in Settings to upload photos.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  // If undetermined, request permission
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    return false;
  }
  return true;
};

/**
 * Launch camera to take a photo
 * @returns {Promise<string | null>} Image URI if successful, null otherwise
 */
export const takePhoto =
  async (): Promise<ImagePicker.ImagePickerAsset | null> => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) {
        // User cancelled - just return null without error
        return null;
      }

      if (result.assets[0]) {
        return result.assets[0];
      }

      Alert.alert("Error", "No photo taken. Please try again.");
      return null;
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
      return null;
    }
  };

/**
 * Launch image picker to select from library
 * @returns {Promise<string | null>} Image URI if successful, null otherwise
 */
export const pickImageFromLibrary =
  async (): Promise<ImagePicker.ImagePickerAsset | null> => {
    try {
      const hasPermission = await requestLibraryPermission();
      if (!hasPermission) {
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) {
        // User cancelled - just return null without error
        return null;
      }

      if (result.assets[0]) {
        return result.assets[0];
      }

      Alert.alert("Error", "No photo selected. Please try again.");
      return null;
    } catch (error) {
      console.error("Error selecting photo:", error);
      Alert.alert("Error", "Failed to select photo. Please try again.");
      return null;
    }
  };
