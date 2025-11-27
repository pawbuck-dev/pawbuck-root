import { useAuth } from "@/context/authContext";
import { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { updatePet } from "@/services/pets";
import { clearUrlCache, uploadFile } from "@/utils/image";
import { pickImageFromLibrary, takePhoto } from "@/utils/imagePicker";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
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
};

export default function PetImage({ pet }: PetImageProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const handleTakePhoto = async () => {
    const image = await takePhoto();

    if (image) {
      setUploading(true);
      try {
        // Generate a unique file path for the pet's profile photo
        const fileExtension = image.uri.split(".").pop() || "jpg";
        const filePath = `${user?.id}/pet-profile-photos/${pet.id}.${fileExtension}`;

        // Upload the image to Supabase
        await uploadFile(image, filePath);

        // Clear the cached URL for this image path
        clearUrlCache(filePath);

        // Update the pet record with the photo URL
        await updatePet(pet.id, {
          photo_url: filePath,
        });

        // Invalidate and refetch pets query to update UI
        await queryClient.invalidateQueries({ queryKey: ["pets", user?.id] });

        Alert.alert("Success", "Photo uploaded successfully!");
      } catch (error) {
        console.error("Error uploading photo:", error);
        Alert.alert("Error", "Failed to upload photo. Please try again.");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleUpload = async () => {
    const image = await pickImageFromLibrary();

    if (image) {
      setUploading(true);
      try {
        // Generate a unique file path for the pet's profile photo
        const fileExtension = image.uri.split(".").pop() || "jpg";
        const filePath = `${user?.id}/pet-profile-photos/${pet.id}.${fileExtension}`;

        // Upload the image to Supabase
        const data = await uploadFile(image, filePath);

        // Clear the cached URL for this image path
        clearUrlCache(data.path);

        // Update the pet record with the photo URL
        await updatePet(pet.id, {
          photo_url: data.path,
        });

        // Invalidate and refetch pets query to update UI
        await queryClient.invalidateQueries({ queryKey: ["pets", user?.id] });

        Alert.alert("Success", "Photo uploaded successfully!");
      } catch (error) {
        console.error("Error uploading photo:", error);
        Alert.alert("Error", "Failed to upload photo. Please try again.");
      } finally {
        setUploading(false);
      }
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
