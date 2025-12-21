import * as DocumentPicker from "expo-document-picker";
import { Alert } from "react-native";

/**
 * Launch document picker to select a PDF file
 * @returns {Promise<string | null>} File URI if successful, null otherwise
 */
export const pickPdfFile =
  async (): Promise<DocumentPicker.DocumentPickerAsset | null> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0];
      }

      Alert.alert("Error", "No PDF file selected. Please try again.");
      return null;
    } catch (error) {
      console.error("Error selecting PDF:", error);
      Alert.alert("Error", "Failed to select PDF file. Please try again.");
      return null;
    }
  };
