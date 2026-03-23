import { useAuth } from "@/context/authContext";
import { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { updatePet } from "@/services/pets";
import { clearUrlCache, uploadFile } from "@/utils/image";
import { pickImageFromLibrary, takePhoto } from "@/utils/imagePicker";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePickerAsset } from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import PrivateImage from "@/components/common/PrivateImage";

type PetImageProps = {
  pet: Pet;
  style?: "default" | "hero";
  onCopyEmail?: () => void;
  emailCopied?: boolean;
};

export default function PetImage({
  pet,
  style = "default",
  onCopyEmail,
  emailCopied = false,
}: PetImageProps) {
  const { theme, mode } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const isDark = mode === "dark";

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
    if (image) await updateImage(image);
  };

  const handleUpload = async () => {
    const image = await pickImageFromLibrary();
    if (image) await updateImage(image);
  };

  const handlePhotoUpload = () => {
    Alert.alert(
      "Upload Photo",
      "Choose an option",
      [
        { text: "Take Photo", onPress: handleTakePhoto },
        { text: "Choose from Gallery", onPress: handleUpload },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  if (style === "hero") {
    return (
      <View
        style={{
          marginHorizontal: 20,
          borderRadius: 20,
          overflow: "hidden",
          backgroundColor: theme.dashedCard,
        }}
      >
        <TouchableOpacity
          onPress={handlePhotoUpload}
          activeOpacity={0.9}
          disabled={uploading}
          style={{ width: "100%", aspectRatio: 16 / 10, justifyContent: "center", alignItems: "center" }}
        >
          {uploading && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
                backgroundColor: "rgba(0,0,0,0.3)",
              }}
            >
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}

          {pet.photo_url ? (
            <PrivateImage
              bucketName="pets"
              filePath={pet.photo_url}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ alignItems: "center", justifyContent: "center", flex: 1 }}>
              <Ionicons name="camera-outline" size={40} color={theme.secondary} />
              <Text style={{ fontSize: 14, fontWeight: "500", color: theme.secondary, marginTop: 8 }}>
                Add Photo
              </Text>
            </View>
          )}

          {/* Camera icon overlay */}
          {pet.photo_url && !uploading && (
            <View
              style={{
                position: "absolute",
                bottom: 48,
                right: 12,
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0,0,0,0.4)",
              }}
            >
              <Ionicons name="camera-outline" size={18} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Email bar overlay at bottom of image card */}
        {pet.email_id && (
          <TouchableOpacity
            onPress={onCopyEmail}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 10,
              paddingHorizontal: 16,
              backgroundColor: isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.6)",
              gap: 8,
            }}
          >
            <Ionicons name="mail-outline" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={{ fontSize: 13, color: emailCopied ? "#4ADE80" : "rgba(255,255,255,0.9)" }}>
              {pet.email_id}@pawbuck.com
            </Text>
            <Ionicons
              name={emailCopied ? "checkmark-circle" : "copy-outline"}
              size={14}
              color={emailCopied ? "#4ADE80" : "rgba(255,255,255,0.6)"}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={{ alignItems: "center", marginBottom: 20 }}>
      <TouchableOpacity
        onPress={handlePhotoUpload}
        activeOpacity={0.7}
        disabled={uploading}
        style={{
          width: 160,
          height: 160,
          borderRadius: 80,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
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
            style={{ width: 160, height: 160 }}
            resizeMode="cover"
          />
        )}
        {!uploading && !pet.photo_url && (
          <>
            <Ionicons name="camera-outline" size={40} color={theme.secondary} />
            <Text style={{ fontSize: 12, marginTop: 8, fontWeight: "500", color: theme.secondary }}>
              Add Photo
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
