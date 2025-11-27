import { CameraButton } from "@/components/upload/CameraButton";
import { FilesButton } from "@/components/upload/FilesButton";
import { LibraryButton } from "@/components/upload/LibraryButton";
import { useTheme } from "@/context/themeContext";
import { pickPdfFile } from "@/utils/filePicker";
import { pickImageFromLibrary, takePhoto } from "@/utils/imagePicker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function VaccinationUploadModal() {
  const { theme, mode } = useTheme();
  const [requesting, setRequesting] = useState(false);

  const handleTakePhoto = async () => {
    setRequesting(true);
    const imageUri = await takePhoto();
    setRequesting(false);

    if (imageUri) {
      // TODO: Handle image upload
      console.log("Image URI:", imageUri);
      router.back();
    }
  };

  const handleUploadFromLibrary = async () => {
    setRequesting(true);
    const imageUri = await pickImageFromLibrary();
    setRequesting(false);

    if (imageUri) {
      // TODO: Handle image upload
      console.log("Image URI:", imageUri);
      router.back();
    }
  };

  const handlePickPdfFile = async () => {
    setRequesting(true);
    const fileUri = await pickPdfFile();
    setRequesting(false);

    if (fileUri) {
      // TODO: Handle PDF upload
      console.log("PDF URI:", fileUri);
      router.back();
    }
  };

  return (
    <View style={{ backgroundColor: theme.background }} className="flex-1">
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

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
