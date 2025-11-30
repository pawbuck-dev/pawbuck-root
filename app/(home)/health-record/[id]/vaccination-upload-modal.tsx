import { CameraButton } from "@/components/upload/CameraButton";
import { FilesButton } from "@/components/upload/FilesButton";
import { LibraryButton } from "@/components/upload/LibraryButton";
import { useAuth } from "@/context/authContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { pickPdfFile } from "@/utils/filePicker";
import { uploadFile } from "@/utils/image";
import { pickImageFromLibrary, takePhoto } from "@/utils/imagePicker";
import { Ionicons } from "@expo/vector-icons";
import { DocumentPickerAsset } from "expo-document-picker";
import { ImagePickerAsset } from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

export default function VaccinationUploadModal() {
  const { theme } = useTheme();
  const [requesting, setRequesting] = useState(false);
  const { user } = useAuth();
  const { pet } = useSelectedPet();

  const handleUploadFile = async (
    file: ImagePickerAsset | DocumentPickerAsset
  ) => {
    try {
      setRequesting(true);
      const extension = file.mimeType?.split("/")[1];
      const data = await uploadFile(
        file,
        `${user?.id}/pet_${pet.name.split(" ").join("_")}_${pet.id}/vaccinations/${Date.now()}.${extension}`
      );
      setRequesting(false);
    } catch (error) {
      console.error("Error uploading file:", error);
      Alert.alert("Error", "Failed to upload file");
    } finally {
      setRequesting(false);
    }
  };

  const handleTakePhoto = async () => {
    setRequesting(true);
    const image = await takePhoto();
    setRequesting(false);

    if (!image) {
      Alert.alert("Error", "No image selected");
      return;
    }

    await handleUploadFile(image);
    router.back();
  };

  const handleUploadFromLibrary = async () => {
    setRequesting(true);
    const image = await pickImageFromLibrary();
    setRequesting(false);

    if (!image) {
      Alert.alert("Error", "No image selected");
      return;
    }

    await handleUploadFile(image);
    router.back();
  };

  const handlePickPdfFile = async () => {
    setRequesting(true);
    const file = await pickPdfFile();
    setRequesting(false);

    if (!file) {
      Alert.alert("Error", "No file selected");
      return;
    }

    await handleUploadFile(file);
    router.back();
  };
  // TODO: Handle PDF upload
  return (
    <View style={{ backgroundColor: theme.background }} className="flex-1">
      <View className="p-6 pt-8">
        {/* Header */}
        <View className="items-center mb-6">
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
          >
            <Ionicons name="camera" size={32} color={theme.primary} />
          </View>
          <Text
            className="text-xl font-semibold text-center"
            style={{ color: theme.foreground }}
          >
            Upload Vaccination Document
          </Text>
          <Text
            className="text-sm text-center mt-2"
            style={{ color: theme.secondary }}
          >
            Choose how you'd like to add your document
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="gap-3">
          <CameraButton onPress={handleTakePhoto} disabled={requesting} />
          <LibraryButton
            onPress={handleUploadFromLibrary}
            disabled={requesting}
          />
          <FilesButton onPress={handlePickPdfFile} disabled={requesting} />
        </View>

        {/* Cancel Button */}
        <TouchableOpacity
          className="mt-4 p-4 rounded-xl items-center"
          style={{ backgroundColor: "rgba(255, 59, 48, 0.1)" }}
          onPress={() => router.back()}
          disabled={requesting}
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
}
