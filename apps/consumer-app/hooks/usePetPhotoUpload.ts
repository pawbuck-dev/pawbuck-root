import type { Pet } from "@/context/petsContext";
import { useAuth } from "@/context/authContext";
import { updatePet } from "@/services/pets";
import { clearUrlCache, uploadFile } from "@/utils/image";
import { pickImageFromLibrary, takePhoto } from "@/utils/imagePicker";
import { useQueryClient } from "@tanstack/react-query";
import type { ImagePickerAsset } from "expo-image-picker";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

export function usePetPhotoUpload(pet: Pet) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const updateImage = useCallback(
    async (image: ImagePickerAsset) => {
      try {
        setUploading(true);
        const fileExtension = image.uri.split(".").pop() || "jpg";
        const filePath = `${user?.id}/pet_${pet.name.split(" ").join("_")}_${pet.id}/profile.${fileExtension}`;
        const data = await uploadFile(image, filePath);
        clearUrlCache(filePath);

        await updatePet(pet.id, { photo_url: data.path });
        await queryClient.invalidateQueries({ queryKey: ["pets", user?.id] });
      } catch (error) {
        console.error("Error uploading pet photo:", error);
        Alert.alert("Error", "Failed to upload photo. Please try again.");
        throw error;
      } finally {
        setUploading(false);
      }
    },
    [pet.id, pet.name, queryClient, user?.id]
  );

  const promptPhotoUpload = useCallback(() => {
    Alert.alert(
      "Update photo",
      "Choose an option",
      [
        {
          text: "Take photo",
          onPress: async () => {
            const image = await takePhoto();
            if (image) await updateImage(image);
          },
        },
        {
          text: "Choose from gallery",
          onPress: async () => {
            const image = await pickImageFromLibrary();
            if (image) await updateImage(image);
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  }, [updateImage]);

  return { uploading, promptPhotoUpload };
}
