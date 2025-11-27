import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

export default function VaccinationUploadModal() {
  const { theme, mode } = useTheme();
  const [requesting, setRequesting] = useState(false);

  const requestCameraPermission = async () => {
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

  const requestLibraryPermission = async () => {
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

  const handleTakePhoto = async () => {
    setRequesting(true);
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        setRequesting(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // TODO: Handle image upload
        console.log("Image URI:", result.assets[0].uri);
        router.back();
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    } finally {
      setRequesting(false);
    }
  };

  const handleUploadFromLibrary = async () => {
    setRequesting(true);
    try {
      const hasPermission = await requestLibraryPermission();
      if (!hasPermission) {
        setRequesting(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // TODO: Handle image upload
        console.log("Image URI:", result.assets[0].uri);
        router.back();
      }
    } catch (error) {
      console.error("Error selecting photo:", error);
      Alert.alert("Error", "Failed to select photo. Please try again.");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      
      <View className="p-6">
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
          <TouchableOpacity
            className="flex-row items-center p-4 rounded-xl"
            style={{ backgroundColor: theme.card }}
            onPress={handleTakePhoto}
            disabled={requesting}
          >
            <View
              className="w-12 h-12 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: "rgba(95, 196, 192, 0.2)" }}
            >
              <Ionicons name="camera-outline" size={24} color={theme.primary} />
            </View>
            <View className="flex-1">
              <Text
                className="text-base font-semibold"
                style={{ color: theme.foreground }}
              >
                Take Photo
              </Text>
              <Text className="text-sm" style={{ color: theme.secondary }}>
                Use camera to capture document
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.secondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center p-4 rounded-xl"
            style={{ backgroundColor: theme.card }}
            onPress={handleUploadFromLibrary}
            disabled={requesting}
          >
            <View
              className="w-12 h-12 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: "rgba(95, 196, 192, 0.2)" }}
            >
              <Ionicons name="images-outline" size={24} color={theme.primary} />
            </View>
            <View className="flex-1">
              <Text
                className="text-base font-semibold"
                style={{ color: theme.foreground }}
              >
                Choose from Library
              </Text>
              <Text className="text-sm" style={{ color: theme.secondary }}>
                Select from your photo library
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.secondary}
            />
          </TouchableOpacity>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity
          className="mt-4 p-4 rounded-xl items-center"
          style={{ backgroundColor: "rgba(255, 59, 48, 0.1)" }}
          onPress={() => router.back()}
          disabled={requesting}
        >
          <Text className="text-base font-semibold" style={{ color: "#FF3B30" }}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

