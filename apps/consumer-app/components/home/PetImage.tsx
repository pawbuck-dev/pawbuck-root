import PrivateImage from "@/components/common/PrivateImage";
import { useTheme } from "@/context/themeContext";
import type { Pet } from "@/context/petsContext";
import { usePetPhotoUpload } from "@/hooks/usePetPhotoUpload";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type PetImageProps = {
  pet: Pet;
  style?: "default" | "hero";
};

export default function PetImage({ pet, style = "default" }: PetImageProps) {
  const { theme } = useTheme();
  const { uploading, promptPhotoUpload } = usePetPhotoUpload(pet);

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
          onPress={promptPhotoUpload}
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
      </View>
    );
  }

  return (
    <View style={{ alignItems: "center", marginBottom: 20 }}>
      <TouchableOpacity
        onPress={promptPhotoUpload}
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
