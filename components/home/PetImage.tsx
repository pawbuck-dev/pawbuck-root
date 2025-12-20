import { useAuth } from "@/context/authContext";
import { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { updatePet } from "@/services/pets";
import { clearUrlCache, uploadFile } from "@/utils/image";
import { pickImageFromLibrary, takePhoto } from "@/utils/imagePicker";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePickerAsset } from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import PrivateImage from "../PrivateImage";

type PetImageProps = {
  pet: Pet;
  style?: "default" | "hero";
};

export default function PetImage({ pet, style = "default" }: PetImageProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const updateImage = async (image: ImagePickerAsset) => {
    try {
      setUploading(true);
      const fileExtension = image.uri.split(".").pop() || "jpg";
      const filePath = `${user?.id}/pet_${pet.name.split(" ").join("_")}_${pet.id}/profile.${fileExtension}`;
      const data = await uploadFile(image, filePath);
      clearUrlCache(filePath);

      await updatePet(pet.id, {
        photo_url: data.path,
      });
      await queryClient.invalidateQueries({ queryKey: ["pets", user?.id] });
      Alert.alert("Success", "Photo uploaded successfully!");
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Error", "Failed to upload image. Please try again.");
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    const image = await takePhoto();

    if (image) {
      await updateImage(image);
      router.back();
    }
  };

  const handleUpload = async () => {
    const image = await pickImageFromLibrary();

    if (image) {
      await updateImage(image);
      router.back();
    }
  };

  const handlePhotoUpload = () => {
    Alert.alert(
      "Upload Photo",
      "Choose an option",
      [
        {
          text: "Take Photo",
          onPress: handleTakePhoto,
        },
        {
          text: "Choose from Gallery",
          onPress: handleUpload,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  // Hero style - large image for the card
  if (style === "hero") {
    return (
      <TouchableOpacity
        onPress={handlePhotoUpload}
        activeOpacity={0.9}
        disabled={uploading}
        className="w-full aspect-[4/2.8] items-center justify-center"
        style={{
          backgroundColor: theme.dashedCard,
        }}
      >
        {uploading && (
          <View className="absolute inset-0 items-center justify-center z-10 bg-black/30">
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {pet.photo_url ? (
          <PrivateImage
            bucketName="pets"
            filePath={pet.photo_url}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="items-center justify-center flex-1">
            <View
              className="w-24 h-24 rounded-2xl items-center justify-center mb-3"
              style={{
                backgroundColor: theme.border,
                borderWidth: 2,
                borderStyle: "dashed",
                borderColor: theme.secondary,
              }}
            >
              <Ionicons name="camera-outline" size={40} color={theme.secondary} />
            </View>
            <Text
              className="text-base font-medium"
              style={{ color: theme.secondary }}
            >
              Add Photo
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // Default style - circular avatar
  return (
    <View className="items-center mb-5">
      <TouchableOpacity
        onPress={handlePhotoUpload}
        activeOpacity={0.7}
        disabled={uploading}
        className="w-40 h-40 rounded-full items-center justify-center overflow-hidden"
        style={{
          backgroundColor: theme.dashedCard,
          borderWidth: pet.photo_url ? 0 : 2,
          borderStyle: "dashed",
          borderColor: theme.border,
        }}
      >
        {uploading && <ActivityIndicator size="small" color={theme.primary} />}

        {!uploading && pet.photo_url && (
          <PrivateImage
            bucketName="pets"
            filePath={pet.photo_url}
            className="w-40 h-40"
            resizeMode="cover"
          />
        )}

        {!uploading && !pet.photo_url && (
          <>
            <Ionicons name="camera-outline" size={40} color={theme.secondary} />
            <Text
              className="text-xs mt-2 font-medium"
              style={{ color: theme.secondary }}
            >
              Add Photo
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
