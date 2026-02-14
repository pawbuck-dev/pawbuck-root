import { ViewMode } from "@/app/(home)/health-record/[id]/medication-upload-modal";
import { useAuth } from "@/context/authContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { pickPdfFile } from "@/utils/filePicker";
import { uploadFile } from "@/utils/image";
import { pickImageFromLibrary, takePhoto } from "@/utils/imagePicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DocumentPickerAsset } from "expo-document-picker";
import { ImagePickerAsset } from "expo-image-picker";
import { router } from "expo-router";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { CameraButton } from "../upload/CameraButton";
import { FilesButton } from "../upload/FilesButton";
import { LibraryButton } from "../upload/LibraryButton";
import { ManualEntryButton } from "../upload/ManualEntryButton";
import { ProcessingStatus } from "./ProcessingOverlay";

interface UploadOptionsProps {
  isProcessing: boolean;
  onDocumentSelected: (documentURL: string) => Promise<void>;
  setStatus: (status: ProcessingStatus) => void;
  setStatusMessage: (statusMessage: string) => void;
  setViewMode: (viewMode: ViewMode) => void;
}

const UploadOptions = ({
  onDocumentSelected,
  isProcessing,
  setStatus,
  setStatusMessage,
  setViewMode,
}: UploadOptionsProps) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { pet } = useSelectedPet();

  const handleUploadFile = async (
    file: ImagePickerAsset | DocumentPickerAsset
  ) => {
    try {
      // Step 1: Uploading
      setStatus("uploading");
      setStatusMessage("Uploading document...");

      const extension = file.mimeType?.split("/")[1];
      const data = await uploadFile(
        file,
        `${user?.id}/pet_${pet.name.split(" ").join("_")}_${pet.id}/medications/${Date.now()}.${extension}`
      );

      // Store the document path for later use
      onDocumentSelected(data.path);
    } catch (error) {
      console.error("Error uploading file:", error);
      setStatus("error");
      setStatusMessage("An error occurred");
      Alert.alert("Error", "Failed to upload file");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const handleTakePhoto = async () => {
    const image = await takePhoto();

    if (!image) {
      return;
    }

    await handleUploadFile(image);
  };

  const handleUploadFromLibrary = async () => {
    const image = await pickImageFromLibrary();
    if (!image) {
      return;
    }

    await handleUploadFile(image);
  };

  const handlePickPdfFile = async () => {
    const file = await pickPdfFile();

    if (!file) {
      return;
    }

    await handleUploadFile(file);
  };

  return (
    <View style={{ backgroundColor: theme.background }} className="flex-1">
      <View className="p-6 pt-8">
        {/* Header */}
        <View className="items-center mb-6">
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
          >
            <MaterialCommunityIcons
              name="pill"
              size={32}
              color={theme.primary}
            />
          </View>
          <Text
            className="text-xl font-semibold text-center"
            style={{ color: theme.foreground }}
          >
            Add Medication
          </Text>
          <Text
            className="text-sm text-center mt-2"
            style={{ color: theme.secondary }}
          >
            Choose how you'd like to add your medication
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="gap-3">
          <CameraButton onPress={handleTakePhoto} disabled={isProcessing} />
          <LibraryButton
            onPress={handleUploadFromLibrary}
            disabled={isProcessing}
          />
          <FilesButton onPress={handlePickPdfFile} disabled={isProcessing} />
          <ManualEntryButton
            onPress={() => setViewMode("manual")}
            disabled={isProcessing}
          />
        </View>

        {/* Cancel Button */}
        <TouchableOpacity
          className="mt-4 p-4 rounded-xl items-center"
          style={{ backgroundColor: "rgba(255, 59, 48, 0.1)" }}
          onPress={() => router.back()}
          disabled={isProcessing}
        >
          <Text
            className="text-base font-semibold"
            style={{ color: "#FF3B30" }}
          >
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default UploadOptions;
