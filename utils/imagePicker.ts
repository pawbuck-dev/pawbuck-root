import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

/**
 * Request camera permissions from the user
 * @returns {Promise<boolean>} True if permission granted, false otherwise
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Permission Denied",
      "Camera permission is required to take photos."
    );
    return false;
  }
  return true;
};

/**
 * Request media library permissions from the user
 * @returns {Promise<boolean>} True if permission granted, false otherwise
 */
export const requestLibraryPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Permission Denied",
      "Photo library permission is required to upload photos."
    );
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

      if (!result.canceled && result.assets[0]) {
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

      if (!result.canceled && result.assets[0]) {
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
