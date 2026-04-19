import PrivateImage from "@/components/common/PrivateImage";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type BodyTrackerObservationBlockProps = {
  title: string;
  note: string;
  onChangeNote: (text: string) => void;
  onBlurSave: () => void;
  photoPath: string | null;
  onAddPhoto: () => void;
  onRemovePhoto: () => void;
  uploadingPhoto: boolean;
  isDark: boolean;
  cardSubtleBg: string;
  borderStyle: object;
  secondaryText: string;
  foreground: string;
  btnBg: string;
};

export default function BodyTrackerObservationBlock({
  title,
  note,
  onChangeNote,
  onBlurSave,
  photoPath,
  onAddPhoto,
  onRemovePhoto,
  uploadingPhoto,
  isDark,
  cardSubtleBg,
  borderStyle,
  secondaryText,
  foreground,
  btnBg,
}: BodyTrackerObservationBlockProps) {
  const { theme } = useTheme();
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  return (
    <View
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 14,
        backgroundColor: cardSubtleBg,
        ...borderStyle,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: "700", color: foreground, marginBottom: 8 }}>{title}</Text>
      <Text style={{ fontSize: 12, color: secondaryText, marginBottom: 6 }}>
        Add a note and photo for your vet (optional).
      </Text>
      <TextInput
        value={note}
        onChangeText={onChangeNote}
        onBlur={onBlurSave}
        placeholder="Note…"
        placeholderTextColor={secondaryText}
        multiline
        textAlignVertical="top"
        style={{
          minHeight: 72,
          paddingHorizontal: 12,
          paddingVertical: Platform.OS === "ios" ? 10 : 8,
          borderRadius: 12,
          backgroundColor: inputBg,
          color: foreground,
          fontSize: 15,
          marginBottom: 10,
        }}
      />

      {photoPath ? (
        <View style={{ marginBottom: 10 }}>
          <View style={{ position: "relative", alignSelf: "flex-start", borderRadius: 12, overflow: "hidden" }}>
            <PrivateImage
              bucketName="pets"
              filePath={photoPath}
              style={{ width: 160, height: 120, borderRadius: 12 }}
              resizeMode="cover"
            />
            <Pressable
              onPress={onRemovePhoto}
              hitSlop={8}
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: "rgba(0,0,0,0.55)",
                alignItems: "center",
                justifyContent: "center",
              }}
              accessibilityLabel="Remove photo"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      ) : null}

      <TouchableOpacity
        onPress={onAddPhoto}
        disabled={uploadingPhoto}
        activeOpacity={0.75}
        style={{
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          gap: 8,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 12,
          backgroundColor: btnBg,
        }}
      >
        {uploadingPhoto ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <Ionicons name="camera-outline" size={20} color={foreground} />
        )}
        <Text style={{ fontSize: 14, fontWeight: "600", color: foreground }}>
          {photoPath ? "Replace photo" : "Add photo"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
