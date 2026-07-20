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
        const fileExtension = image.uri.split(".").pop()?.split("?")[0] || "jpg";
        // Unique path so PrivateImage remounts after replace (same profile.jpg would keep a stale signed URL).
        const filePath = `${user?.id}/pet_${pet.name.split(" ").join("_")}_${pet.id}/profile_${Date.now()}.${fileExtension}`;
        const data = await uploadFile(image, filePath);
        if (pet.photo_url) clearUrlCache(pet.photo_url);
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
    [pet.id, pet.name, pet.photo_url, queryClient, user?.id]
  );

  const squareCrop = { allowsEditing: true, aspect: [1, 1] as [number, number] };

  const promptPhotoUpload = useCallback(() => {
    Alert.alert(
      "Update photo",
      "Choose an option — you can crop to a square after selecting",
      [
        {
          text: "Take photo",
          onPress: async () => {
            const image = await takePhoto(squareCrop);
            if (image) await updateImage(image);
          },
        },
        {
          text: "Choose from gallery",
          onPress: async () => {
            const image = await pickImageFromLibrary(squareCrop);
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
